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
import { Public } from '@common/decorators/public.decorator';
import { ApiResponse as AppApiResponse } from '@common/types/response.type';
import { YouTubeService } from '../services/youtube.service';
import { YouTubeOAuthService } from '../services/youtube-oauth.service';
import { UploadVideoModel } from '../models/upload-video.model';
import { SetThumbnailModel } from '../models/set-thumbnail.model';
import { VideoResponseModel } from '../models/video-response.model';
import { AccountResponseModel } from '../models/account-response.model';
import { ConnectResponseModel } from '../models/connect-response.model';
import { YouTubeAccount } from '../entities/youtube-account.entity';
import { VideoType, VideoTypeLabel } from '../types/youtube.type';

/**
 * Handles all YouTube-related HTTP endpoints.
 *
 * Provides three groups of operations:
 * - **OAuth** — connect/disconnect YouTube channels via Google OAuth
 * - **Accounts** — list and manage connected channels
 * - **Videos** — upload, list, retrieve videos and set thumbnails
 */
@ApiTags('youtube')
@Controller('youtube')
export class YouTubeController {
  constructor(
    private readonly youtubeService: YouTubeService,
    private readonly youtubeOAuthService: YouTubeOAuthService,
  ) {}

  // ── OAuth ────────────────────────────────────────────────────────────────────

  /**
   * Generates the Google OAuth authorization URL for YouTube.
   *
   * The consumer should open the returned `authUrl` in a browser to
   * initiate the Google OAuth flow. After the user grants permission,
   * Google redirects to the configured callback endpoint with an
   * authorization code.
   *
   * @returns Response containing the OAuth authorization URL
   */
  @Public()
  @Get('auth/connect')
  @ApiOperation({ summary: 'Get Google OAuth URL for YouTube' })
  @ApiResponse({ status: 200, description: 'OAuth URL generated successfully' })
  getConnectUrl(): AppApiResponse<ConnectResponseModel> {
    const authUrl = this.youtubeOAuthService.getAuthUrl();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Open the authUrl in a browser to connect your YouTube channel',
      data: { authUrl },
    };
  }

  /**
   * Handles the OAuth callback from Google.
   *
   * Delegates the full connect flow (token exchange, channel profile fetch, upsert)
   * to {@link YouTubeOAuthService.connectAccount}.
   *
   * @param code - The authorization code provided by Google
   * @returns The connected YouTube account details
   */
  @Public()
  @Get('auth/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Google redirect' })
  @ApiResponse({ status: 200, description: 'Channel connected successfully' })
  @ApiResponse({ status: 400, description: 'Missing OAuth code' })
  async handleCallback(@Query('code') code: string): Promise<AppApiResponse<AccountResponseModel>> {
    if (!code) {
      throw new HttpException('Missing OAuth code', HttpStatus.BAD_REQUEST);
    }

    const account = await this.youtubeOAuthService.connectAccount(code);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `YouTube channel "${account.channelTitle}" connected successfully`,
      data: this.toAccountResponse(account),
    };
  }

  // ── Accounts ─────────────────────────────────────────────────────────────────

  /**
   * Lists all active YouTube channels.
   *
   * Returns channels that have been connected via OAuth and have not been
   * deactivated. Deactivated channels are excluded from the response.
   *
   * @returns Array of active account details
   */
  @Public()
  @Get('accounts')
  @ApiOperation({ summary: 'List connected YouTube channels' })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  async listAccounts(): Promise<AppApiResponse<AccountResponseModel[]>> {
    const accounts = await this.youtubeOAuthService.listAccounts();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Accounts retrieved successfully',
      data: accounts.map((a) => this.toAccountResponse(a)),
    };
  }

  /**
   * Disconnects a YouTube channel by soft-deleting it.
   *
   * The account record remains in the database for audit purposes
   * but will no longer appear in list queries or be usable for uploads.
   *
   * @param id - UUID of the account to disconnect
   */
  @Public()
  @Delete('accounts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect a YouTube channel' })
  @ApiParam({ name: 'id', description: 'UUID of the account to disconnect' })
  @ApiResponse({ status: 200, description: 'Account disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async disconnectAccount(@Param('id', ParseUUIDPipe) id: string): Promise<AppApiResponse<null>> {
    await this.youtubeOAuthService.deactivateAccount(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Account disconnected successfully',
      data: null,
    };
  }

  // ── Videos ─────────────────────────────────────────────────────────────────────

  /**
   * Uploads a YouTube video or Short.
   *
   * Orchestrates the full YouTube upload flow:
   * 1. Validates the account and refreshes the token if near expiry
   * 2. Streams the video from the URL and uploads to YouTube
   * 3. Polls processing status until complete
   * 4. Returns the published video details
   *
   * @param dto - Video upload payload
   * @returns The uploaded video details including YouTube URL
   */
  @Public()
  @Post('videos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a YouTube video or Short' })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 502, description: 'YouTube API error during upload' })
  async uploadVideo(@Body() dto: UploadVideoModel): Promise<AppApiResponse<VideoResponseModel>> {
    const video = await this.youtubeService.uploadVideo(dto);
    const typeLabel = VideoTypeLabel[dto.videoType ?? VideoType.VIDEO];
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `YouTube ${typeLabel} uploaded successfully`,
      data: video,
    };
  }

  /**
   * Sets a custom thumbnail on a YouTube video.
   *
   * The video must already be published and have a YouTube video ID.
   *
   * @param dto - Thumbnail request with account ID, video ID, and image URL
   * @returns The updated video details
   */
  @Public()
  @Post('videos/thumbnail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a custom thumbnail on a YouTube video' })
  @ApiResponse({ status: 200, description: 'Thumbnail set successfully' })
  @ApiResponse({ status: 404, description: 'Video or account not found' })
  @ApiResponse({ status: 400, description: 'Video is not in published status' })
  @ApiResponse({ status: 502, description: 'YouTube API error' })
  async setThumbnail(@Body() dto: SetThumbnailModel): Promise<AppApiResponse<VideoResponseModel>> {
    const video = await this.youtubeService.setThumbnail(dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Thumbnail set successfully',
      data: video,
    };
  }

  /**
   * Lists all videos ordered by creation date (newest first).
   *
   * @returns Array of all videos with their current status
   */
  @Public()
  @Get('videos')
  @ApiOperation({ summary: 'List all YouTube videos' })
  @ApiResponse({ status: 200, description: 'Videos retrieved successfully' })
  async listVideos(): Promise<AppApiResponse<VideoResponseModel[]>> {
    const videos = await this.youtubeService.listVideos();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Videos retrieved successfully',
      data: videos,
    };
  }

  /**
   * Retrieves a single video by its UUID.
   *
   * @param id - UUID of the video to retrieve
   * @returns The video details
   */
  @Public()
  @Get('videos/:id')
  @ApiOperation({ summary: 'Get a single YouTube video by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the video' })
  @ApiResponse({ status: 200, description: 'Video retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideo(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse<VideoResponseModel>> {
    const video = await this.youtubeService.getVideo(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Video retrieved successfully',
      data: video,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /**
   * Maps a {@link YouTubeAccount} entity to the public API response shape.
   *
   * Strips sensitive fields (access token, refresh token) and returns
   * only the fields that consumers need to see.
   *
   * @param account - The account entity from the database
   * @returns Sanitized account response
   */
  private toAccountResponse(account: YouTubeAccount): AccountResponseModel {
    return {
      id: account.id,
      channelId: account.channelId,
      channelTitle: account.channelTitle,
      customUrl: account.customUrl,
      thumbnailUrl: account.thumbnailUrl,
      tokenExpiresAt: account.tokenExpiresAt,
      createdAt: account.createdAt,
    };
  }
}
