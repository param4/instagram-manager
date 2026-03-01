import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InstagramService } from '../services/instagram.service';
import { InstagramOAuthService } from '../services/instagram-oauth.service';
import { CreatePostModel } from '../models/create-post.model';
import { ApiResponse as AppApiResponse } from '@common/types/response.type';
import { PostResponseModel } from '../models/post-response.model';
import { AccountResponseModel } from '../models/account-response.model';
import { ConnectResponseModel } from '../models/connect-response.model';
import { InstagramAccount } from '../entities/instagram-account.entity';
import { MediaType } from '../types/instagram.type';

/**
 * Handles all Instagram-related HTTP endpoints.
 *
 * Provides three groups of operations:
 * - **OAuth** — connect/disconnect Instagram accounts via Instagram Login
 * - **Accounts** — list and manage connected accounts
 * - **Posts** — create, list, and retrieve published posts
 */
@ApiTags('instagram')
@Controller('instagram')
export class InstagramController {
  constructor(
    private readonly instagramService: InstagramService,
    private readonly instagramOAuthService: InstagramOAuthService,
  ) {}

  // ── OAuth ────────────────────────────────────────────────────────────────────

  /**
   * Generates the Instagram OAuth authorization URL.
   *
   * The consumer should open the returned `authUrl` in a browser to
   * initiate the Instagram Login flow. After the user grants permission,
   * Instagram redirects to the configured callback endpoint with an
   * authorization code.
   *
   * @returns Response containing the OAuth authorization URL
   */
  @Get('auth/connect')
  @ApiOperation({ summary: 'Get Instagram OAuth URL' })
  @ApiResponse({ status: 200, description: 'OAuth URL generated successfully' })
  getConnectUrl(): AppApiResponse<ConnectResponseModel> {
    const authUrl = this.instagramOAuthService.getAuthUrl();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Open the authUrl in a browser to connect your Instagram account',
      data: { authUrl },
    };
  }

  /**
   * Handles the OAuth callback from Instagram.
   *
   * Receives the authorization code, exchanges it for a long-lived token,
   * fetches the user profile, and upserts the account in the database.
   * If the account already exists, its token and profile data are refreshed.
   *
   * @param code - The authorization code provided by Instagram
   * @returns The connected Instagram account details
   */
  @Get('auth/callback')
  @ApiOperation({ summary: 'Handle Instagram OAuth callback' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Instagram redirect' })
  @ApiResponse({ status: 200, description: 'Account connected successfully' })
  @ApiResponse({ status: 400, description: 'Missing OAuth code' })
  async handleCallback(@Query('code') code: string): Promise<AppApiResponse<AccountResponseModel>> {
    if (!code) {
      throw new HttpException('Missing OAuth code', HttpStatus.BAD_REQUEST);
    }

    const { accessToken, expiresAt } = await this.instagramOAuthService.exchangeCodeForToken(code);

    const profile = await this.instagramOAuthService.getProfile(accessToken);
    const account = await this.instagramOAuthService.upsertAccount(profile, accessToken, expiresAt);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Instagram account @${account.username} connected successfully`,
      data: this.toAccountResponse(account),
    };
  }

  // ── Accounts ─────────────────────────────────────────────────────────────────

  /**
   * Lists all active Instagram accounts.
   *
   * Returns accounts that have been connected via OAuth and have not been
   * deactivated. Deactivated accounts are excluded from the response.
   *
   * @returns Array of active account details
   */
  @Get('accounts')
  @ApiOperation({ summary: 'List connected Instagram accounts' })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  async listAccounts(): Promise<AppApiResponse<AccountResponseModel[]>> {
    const accounts = await this.instagramOAuthService.listAccounts();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Accounts retrieved successfully',
      data: accounts.map((a) => this.toAccountResponse(a)),
    };
  }

  /**
   * Disconnects an Instagram account by soft-deleting it.
   *
   * Sets the account's `isActive` flag to `false`. The account record
   * remains in the database for audit purposes, but it will no longer
   * appear in list queries or be usable for posting.
   *
   * @param id - UUID of the account to disconnect
   */
  @Delete('accounts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect an Instagram account' })
  @ApiParam({ name: 'id', description: 'UUID of the account to disconnect' })
  @ApiResponse({ status: 200, description: 'Account disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async disconnectAccount(@Param('id', ParseUUIDPipe) id: string): Promise<AppApiResponse<null>> {
    await this.instagramOAuthService.deactivateAccount(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Account disconnected successfully',
      data: null,
    };
  }

  // ── Posts ─────────────────────────────────────────────────────────────────────

  /**
   * Publishes a new Instagram post or reel.
   *
   * Orchestrates the full Instagram publishing flow:
   * 1. Validates the account and refreshes the token if near expiry
   * 2. Creates a media container on the Instagram API
   * 3. Polls the container status until it is ready
   * 4. Publishes the container to the user's feed
   *
   * For reels (video), the polling phase may take longer due to server-side
   * transcoding. The default media type is `IMAGE`.
   *
   * @param dto - Post creation payload with account ID, media URL, optional caption and media type
   * @returns The published post details including Instagram media ID
   */
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and publish an Instagram post or reel' })
  @ApiResponse({ status: 201, description: 'Post published successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 502, description: 'Instagram API error during publishing' })
  async createPost(@Body() dto: CreatePostModel): Promise<AppApiResponse<PostResponseModel>> {
    const post = await this.instagramService.createPost(dto);
    const typeLabel = dto.mediaType === MediaType.REELS ? 'reel' : 'post';
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `Instagram ${typeLabel} published successfully`,
      data: post,
    };
  }

  /**
   * Lists all posts ordered by creation date (newest first).
   *
   * @returns Array of all posts with their current status
   */
  @Get('posts')
  @ApiOperation({ summary: 'List all Instagram posts' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  async listPosts(): Promise<AppApiResponse<PostResponseModel[]>> {
    const posts = await this.instagramService.listPosts();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Posts retrieved successfully',
      data: posts,
    };
  }

  /**
   * Retrieves a single post by its UUID.
   *
   * @param id - UUID of the post to retrieve
   * @returns The post details
   */
  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a single Instagram post by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the post' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPost(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse<PostResponseModel>> {
    const post = await this.instagramService.getPost(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Post retrieved successfully',
      data: post,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /**
   * Maps an {@link InstagramAccount} entity to the public API response shape.
   *
   * Strips sensitive fields (access token) and returns only the fields
   * that consumers need to see.
   *
   * @param account - The account entity from the database
   * @returns Sanitized account response
   */
  private toAccountResponse(account: InstagramAccount): AccountResponseModel {
    return {
      id: account.id,
      igUserId: account.igUserId,
      username: account.username,
      name: account.name,
      profilePictureUrl: account.profilePictureUrl,
      tokenExpiresAt: account.tokenExpiresAt,
      isActive: account.isActive,
      createdAt: account.createdAt,
    };
  }
}
