import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@config/config.service';
import { InstagramAccount } from '../entities/instagram-account.entity';
import {
  GraphApiErrorResponse,
  InstagramUserProfile,
  LongLivedTokenResponse,
  ShortLivedTokenResponse,
  TokenRefreshResponse,
} from '../types/instagram.type';

/**
 * Manages Instagram OAuth authentication and account lifecycle.
 *
 * Implements the Instagram Login flow using the Instagram Platform API:
 * 1. Generate authorization URL for user consent
 * 2. Exchange authorization code for short-lived token
 * 3. Upgrade to a 60-day long-lived token
 * 4. Auto-refresh tokens that are within 7 days of expiry
 *
 * @link https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 */
@Injectable()
export class InstagramOAuthService {
  private readonly apiBase: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(InstagramAccount)
    private readonly accountRepo: Repository<InstagramAccount>,
  ) {
    this.apiBase = `https://graph.instagram.com/${config.igApiVersion}`;
  }

  /**
   * Builds the Instagram OAuth authorization URL.
   *
   * Constructs a URL with the configured app ID, redirect URI, and required
   * scopes (`instagram_business_basic`, `instagram_business_content_publish`).
   * The consumer should redirect the user to this URL to begin the OAuth flow.
   *
   * @returns The full Instagram OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.igAppId,
      redirect_uri: this.config.igRedirectUri,
      scope: 'instagram_business_basic,instagram_business_content_publish',
      response_type: 'code',
    });
    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchanges an authorization code for a long-lived access token.
   *
   * Performs a two-step token exchange:
   * 1. Exchanges the authorization code for a short-lived token (valid ~1 hour)
   * 2. Upgrades the short-lived token to a long-lived token (valid ~60 days)
   *
   * @param code - The authorization code received from Instagram's OAuth redirect
   * @returns Object containing the Instagram user ID, access token, and expiration date
   */
  async exchangeCodeForToken(
    code: string,
  ): Promise<{ igUserId: string; accessToken: string; expiresAt: Date }> {
    // Step 1: exchange code for short-lived token
    const body = new URLSearchParams({
      client_id: this.config.igAppId,
      client_secret: this.config.igAppSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.config.igRedirectUri,
      code,
    });

    const shortLivedRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const shortLived = (await shortLivedRes.json()) as
      | ShortLivedTokenResponse
      | GraphApiErrorResponse;

    if ('error' in shortLived) {
      throw new Error(`Short-lived token exchange failed: ${shortLived.error.message}`);
    }

    // Step 2: upgrade to 60-day long-lived token
    const longLivedParams = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.config.igAppSecret,
      access_token: shortLived.access_token,
    });

    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?${longLivedParams.toString()}`,
    );

    const longLived = (await longLivedRes.json()) as LongLivedTokenResponse | GraphApiErrorResponse;

    if ('error' in longLived) {
      throw new Error(`Long-lived token exchange failed: ${longLived.error.message}`);
    }

    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);

    return {
      igUserId: shortLived.user_id,
      accessToken: longLived.access_token,
      expiresAt,
    };
  }

  /**
   * Fetches the authenticated user's Instagram profile.
   *
   * Calls the `GET /me` endpoint with fields: `id`, `username`, `name`,
   * and `profile_picture_url`.
   *
   * @param accessToken - A valid Instagram access token
   * @returns The user's Instagram profile data
   */
  async getProfile(accessToken: string): Promise<InstagramUserProfile> {
    const params = new URLSearchParams({
      fields: 'id,username,name,profile_picture_url',
      access_token: accessToken,
    });

    const res = await fetch(`${this.apiBase}/me?${params.toString()}`);
    const data = (await res.json()) as InstagramUserProfile | GraphApiErrorResponse;

    if ('error' in data) {
      throw new Error(`Failed to fetch profile: ${data.error.message}`);
    }

    return data;
  }

  /**
   * Creates or updates an Instagram account record.
   *
   * If an account with the same `igUserId` already exists, updates its
   * profile data, access token, and reactivates it. Otherwise, creates
   * a new account record.
   *
   * @param profile - The user's Instagram profile from the API
   * @param accessToken - The long-lived access token
   * @param expiresAt - When the access token expires
   * @returns The persisted account entity
   */
  async upsertAccount(
    profile: InstagramUserProfile,
    accessToken: string,
    expiresAt: Date,
  ): Promise<InstagramAccount> {
    const existing = await this.accountRepo.findOne({
      where: { igUserId: profile.id },
    });

    if (existing) {
      existing.username = profile.username;
      existing.name = profile.name ?? null;
      existing.profilePictureUrl = profile.profile_picture_url ?? null;
      existing.accessToken = accessToken;
      existing.tokenExpiresAt = expiresAt;
      existing.isActive = true;
      return this.accountRepo.save(existing);
    }

    const account = this.accountRepo.create({
      igUserId: profile.id,
      username: profile.username,
      name: profile.name ?? null,
      profilePictureUrl: profile.profile_picture_url ?? null,
      accessToken,
      tokenExpiresAt: expiresAt,
      isActive: true,
    });

    return this.accountRepo.save(account);
  }

  /**
   * Refreshes the access token if it is within 7 days of expiry.
   *
   * Calls the Instagram `ig_refresh_token` endpoint to obtain a new
   * 60-day token. If the token is not near expiry, returns the account
   * unchanged.
   *
   * @param account - The account whose token to check and potentially refresh
   * @returns The account with an up-to-date token
   */
  async refreshTokenIfNeeded(account: InstagramAccount): Promise<InstagramAccount> {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const isNearExpiry = account.tokenExpiresAt.getTime() - Date.now() < sevenDaysMs;

    if (!isNearExpiry) {
      return account;
    }

    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: account.accessToken,
    });

    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?${params.toString()}`,
    );
    const data = (await res.json()) as TokenRefreshResponse | GraphApiErrorResponse;

    if ('error' in data) {
      throw new Error(`Token refresh failed: ${data.error.message}`);
    }

    account.accessToken = data.access_token;
    account.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    return this.accountRepo.save(account);
  }

  /**
   * Retrieves an active Instagram account by its UUID.
   *
   * @param id - UUID of the account
   * @returns The active account entity
   * @throws NotFoundException if no active account matches the given ID
   */
  async getAccount(id: string): Promise<InstagramAccount> {
    const account = await this.accountRepo.findOne({ where: { id, isActive: true } });
    if (!account) {
      throw new NotFoundException(`Instagram account ${id} not found`);
    }
    return account;
  }

  /**
   * Lists all active Instagram accounts.
   *
   * @returns Array of active account entities
   */
  async listAccounts(): Promise<InstagramAccount[]> {
    return this.accountRepo.find({ where: { isActive: true } });
  }

  /**
   * Soft-deletes an Instagram account by setting `isActive` to `false`.
   *
   * The account record remains in the database for audit purposes.
   *
   * @param id - UUID of the account to deactivate
   * @throws NotFoundException if no active account matches the given ID
   */
  async deactivateAccount(id: string): Promise<void> {
    const account = await this.getAccount(id);
    account.isActive = false;
    await this.accountRepo.save(account);
  }
}
