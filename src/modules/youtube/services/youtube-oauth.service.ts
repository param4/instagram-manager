import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google } from 'googleapis';
import { ConfigService } from '@config/config.service';
import { YouTubeAccount } from '../entities/youtube-account.entity';
import { YouTubeChannelProfile } from '../types/youtube.type';

/**
 * Manages Google OAuth 2.0 authentication and YouTube account lifecycle.
 *
 * Implements the Google OAuth flow for YouTube:
 * 1. Generate authorization URL for user consent
 * 2. Exchange authorization code for access + refresh tokens
 * 3. Fetch YouTube channel profile
 * 4. Auto-refresh access tokens (1hr expiry) using the stored refresh token
 *
 * @link https://developers.google.com/youtube/v3/guides/authentication
 */
@Injectable()
export class YouTubeOAuthService {
  private readonly logger = new Logger(YouTubeOAuthService.name);
  private readonly oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(YouTubeAccount)
    private readonly accountRepo: Repository<YouTubeAccount>,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      config.ytClientId,
      config.ytClientSecret,
      config.ytRedirectUri,
    );
  }

  /**
   * Builds the Google OAuth consent URL.
   *
   * Constructs a URL with the required YouTube scopes and `access_type: 'offline'`
   * so that a refresh token is returned on the first authorization. The consumer
   * should redirect the user to this URL to begin the OAuth flow.
   *
   * @returns The full Google OAuth authorization URL
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
    });
  }

  /**
   * Completes the full OAuth flow: exchanges the code, fetches the channel
   * profile, and upserts the account in the database.
   *
   * @param code - The authorization code from Google's OAuth redirect
   * @returns The connected (or updated) YouTube account entity
   */
  async connectAccount(code: string): Promise<YouTubeAccount> {
    const { accessToken, refreshToken, expiresAt } = await this.exchangeCodeForTokens(code);
    const profile = await this.getChannelProfile(accessToken);
    return this.upsertAccount(profile, accessToken, refreshToken, expiresAt);
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   *
   * Google returns both tokens in a single exchange. The access token
   * expires in ~1 hour; the refresh token is long-lived and used to
   * obtain new access tokens.
   *
   * @param code - The authorization code received from Google's OAuth redirect
   * @returns Object containing access token, refresh token, and expiration date
   */
  async exchangeCodeForTokens(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error(
        'Google OAuth token exchange did not return required tokens. ' +
          'Ensure the app requests offline access with prompt=consent.',
      );
    }

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    };
  }

  /**
   * Fetches the authenticated user's YouTube channel profile.
   *
   * Calls `channels.list(mine=true)` with snippet fields to get the
   * channel ID, title, custom URL, and thumbnail.
   *
   * @param accessToken - A valid Google OAuth access token
   * @returns The user's YouTube channel profile data
   */
  async getChannelProfile(accessToken: string): Promise<YouTubeChannelProfile> {
    const client = new google.auth.OAuth2();
    client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth: client });
    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      throw new Error('No YouTube channel found for this Google account');
    }

    return {
      channelId: channel.id!,
      title: channel.snippet?.title ?? '',
      customUrl: channel.snippet?.customUrl ?? null,
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? null,
    };
  }

  /**
   * Creates or updates a YouTube account record.
   *
   * Searches with `withDeleted: true` so previously disconnected accounts
   * can be found and restored. If the account exists (even soft-deleted),
   * updates its profile data, tokens, and clears `deletedAt` to restore it.
   * Otherwise, creates a new record.
   *
   * @param profile - The channel profile from the YouTube API
   * @param accessToken - The Google OAuth access token
   * @param refreshToken - The Google OAuth refresh token
   * @param expiresAt - When the access token expires
   * @returns The persisted account entity
   */
  async upsertAccount(
    profile: YouTubeChannelProfile,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<YouTubeAccount> {
    const existing = await this.accountRepo.findOne({
      where: { channelId: profile.channelId },
      withDeleted: true,
    });

    if (existing) {
      existing.channelTitle = profile.title;
      existing.customUrl = profile.customUrl;
      existing.thumbnailUrl = profile.thumbnailUrl;
      existing.accessToken = accessToken;
      existing.refreshToken = refreshToken;
      existing.tokenExpiresAt = expiresAt;
      existing.deletedAt = null;
      return this.accountRepo.save(existing);
    }

    const account = this.accountRepo.create({
      channelId: profile.channelId,
      channelTitle: profile.title,
      customUrl: profile.customUrl,
      thumbnailUrl: profile.thumbnailUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresAt,
    });

    return this.accountRepo.save(account);
  }

  /**
   * Refreshes the access token if it is within 5 minutes of expiry.
   *
   * Uses the stored refresh token to obtain a new access token from Google.
   * Google access tokens expire in ~1 hour, so we refresh aggressively.
   *
   * @param account - The account whose token to check and potentially refresh
   * @returns The account with an up-to-date token
   */
  async refreshTokenIfNeeded(account: YouTubeAccount): Promise<YouTubeAccount> {
    const fiveMinutesMs = 5 * 60 * 1000;
    const isNearExpiry = account.tokenExpiresAt.getTime() - Date.now() < fiveMinutesMs;

    if (!isNearExpiry) {
      return account;
    }

    this.logger.log(`Refreshing token for account ${account.id}`);

    this.oauth2Client.setCredentials({ refresh_token: account.refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh Google OAuth access token');
    }

    account.accessToken = credentials.access_token;
    account.tokenExpiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    return this.accountRepo.save(account);
  }

  /**
   * Retrieves a YouTube account by its UUID.
   *
   * TypeORM automatically excludes soft-deleted rows (`deletedAt IS NOT NULL`),
   * so only active accounts are returned.
   *
   * @param id - UUID of the account
   * @returns The account entity
   * @throws NotFoundException if no active account matches the given ID
   */
  async getAccount(id: string): Promise<YouTubeAccount> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`YouTube account ${id} not found`);
    }
    return account;
  }

  /**
   * Lists all active YouTube accounts.
   *
   * TypeORM automatically excludes soft-deleted rows, so only
   * accounts with `deletedAt = null` are returned.
   *
   * @returns Array of active account entities
   */
  async listAccounts(): Promise<YouTubeAccount[]> {
    return this.accountRepo.find();
  }

  /**
   * Soft-deletes a YouTube account using TypeORM's `@DeleteDateColumn`.
   *
   * Sets `deletedAt` to the current timestamp. The account record remains
   * in the database for audit purposes but is excluded from standard queries.
   *
   * @param id - UUID of the account to deactivate
   * @throws NotFoundException if no active account matches the given ID
   */
  async deactivateAccount(id: string): Promise<void> {
    const account = await this.getAccount(id);
    await this.accountRepo.softRemove(account);
  }
}
