import { Injectable, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YouTubeVideo } from '../entities/youtube-video.entity';
import { VideoStatus, VideoType } from '../types/youtube.type';
import { YouTubeApiService } from './youtube-api.service';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { UploadVideoModel } from '../models/upload-video.model';
import { SetThumbnailModel } from '../models/set-thumbnail.model';
import { VideoResponseModel } from '../models/video-response.model';
import { AsyncUtil } from '@common/utils/async.util';

/** Polling interval in milliseconds for checking video processing status */
const POLLING_INTERVAL_MS = 5000;

/** Maximum polling attempts before timing out */
const MAX_POLLING_ATTEMPTS = 60;

/**
 * Orchestrates YouTube video uploads and lifecycle management.
 *
 * Coordinates between {@link YouTubeOAuthService} (account/token management)
 * and {@link YouTubeApiService} (YouTube Data API calls) to implement the
 * full upload flow:
 *
 * 1. Validate account and refresh token if needed
 * 2. Stream video from URL and upload to YouTube
 * 3. Poll processing status until complete
 * 4. Track video status throughout the lifecycle
 */
@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);

  constructor(
    @InjectRepository(YouTubeVideo)
    private readonly videoRepository: Repository<YouTubeVideo>,
    private readonly youtubeApiService: YouTubeApiService,
    private readonly youtubeOAuthService: YouTubeOAuthService,
  ) {}

  /**
   * Uploads a video to YouTube.
   *
   * Executes the full upload pipeline synchronously:
   * 1. Looks up the account and refreshes the token if near expiry
   * 2. Creates a video record as PENDING
   * 3. Streams the video from the URL and uploads to YouTube
   * 4. Polls processing status until complete
   * 5. Marks as PUBLISHED with the YouTube URL
   *
   * The video entity is persisted at each status transition for auditability.
   * On failure, the video is marked as `FAILED` with the error message stored.
   *
   * @param dto - The video upload request
   * @returns The uploaded video response
   * @throws HttpException with 502 status if the YouTube API returns an error
   */
  async uploadVideo(dto: UploadVideoModel): Promise<VideoResponseModel> {
    const account = await this.youtubeOAuthService.getAccount(dto.accountId);
    const refreshedAccount = await this.youtubeOAuthService.refreshTokenIfNeeded(account);

    const videoType = dto.videoType ?? VideoType.VIDEO;

    const video = this.videoRepository.create({
      videoType,
      videoUrl: dto.videoUrl,
      title: dto.title,
      description: dto.description ?? null,
      tags: dto.tags ?? null,
      privacyStatus: dto.privacyStatus,
      status: VideoStatus.PENDING,
      accountId: refreshedAccount.id,
    });
    await this.videoRepository.save(video);

    try {
      video.status = VideoStatus.UPLOADING;
      await this.videoRepository.save(video);

      const tags = dto.tags ? dto.tags.split(',').map((t) => t.trim()) : null;

      const result = await this.youtubeApiService.uploadVideo(
        refreshedAccount.accessToken,
        dto.videoUrl,
        dto.title,
        dto.description ?? null,
        tags,
        dto.privacyStatus!,
        videoType === VideoType.SHORT,
      );

      video.youtubeVideoId = result.id;
      video.status = VideoStatus.PROCESSING;
      await this.videoRepository.save(video);
      this.logger.log(`Video uploaded: YouTube ID ${result.id} for video ${video.id}`);

      await this.waitForProcessingComplete(video, refreshedAccount.accessToken);

      const isShort = videoType === VideoType.SHORT;
      video.youtubeUrl = isShort
        ? `https://www.youtube.com/shorts/${result.id}`
        : `https://www.youtube.com/watch?v=${result.id}`;
      video.status = VideoStatus.PUBLISHED;
      await this.videoRepository.save(video);
      this.logger.log(`Video published: ${video.youtubeUrl}`);

      return this.toResponse(video);
    } catch (error) {
      video.status = VideoStatus.FAILED;
      video.errorMessage = error instanceof Error ? error.message : String(error);
      await this.videoRepository.save(video);
      this.logger.error(`Video ${video.id} failed: ${video.errorMessage}`);

      throw new HttpException(
        {
          message: 'YouTube upload failed',
          detail: video.errorMessage,
          videoId: video.id,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Sets a custom thumbnail on an uploaded YouTube video.
   *
   * The video must be in `PUBLISHED` status and have a `youtubeVideoId`.
   *
   * @param dto - The thumbnail request with account ID, video ID, and thumbnail URL
   * @returns The updated video response
   * @throws NotFoundException if the video is not found
   * @throws HttpException with 400 if the video is not in PUBLISHED status
   * @throws HttpException with 502 if the YouTube API fails
   */
  async setThumbnail(dto: SetThumbnailModel): Promise<VideoResponseModel> {
    const account = await this.youtubeOAuthService.getAccount(dto.accountId);
    const refreshedAccount = await this.youtubeOAuthService.refreshTokenIfNeeded(account);

    const video = await this.videoRepository.findOneBy({ id: dto.videoId });
    if (!video) {
      throw new NotFoundException(`Video ${dto.videoId} not found`);
    }

    if (video.status !== VideoStatus.PUBLISHED || !video.youtubeVideoId) {
      throw new HttpException(
        'Thumbnail can only be set on published videos with a YouTube video ID',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.youtubeApiService.setThumbnail(
        refreshedAccount.accessToken,
        video.youtubeVideoId,
        dto.thumbnailUrl,
      );

      video.thumbnailUrl = dto.thumbnailUrl;
      await this.videoRepository.save(video);

      return this.toResponse(video);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Thumbnail set failed for video ${video.id}: ${message}`);

      throw new HttpException(
        {
          message: 'Failed to set YouTube thumbnail',
          detail: message,
          videoId: video.id,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Retrieves a single video by its UUID.
   *
   * @param id - UUID of the video
   * @returns The video response
   * @throws NotFoundException if the video is not found
   */
  async getVideo(id: string): Promise<VideoResponseModel> {
    const video = await this.videoRepository.findOneBy({ id });
    if (!video) {
      throw new NotFoundException(`Video ${id} not found`);
    }
    return this.toResponse(video);
  }

  /**
   * Lists all videos ordered by creation date (newest first).
   *
   * @returns Array of video responses
   */
  async listVideos(): Promise<VideoResponseModel[]> {
    const videos = await this.videoRepository.find({
      order: { createdAt: 'DESC' },
    });
    return videos.map((v) => this.toResponse(v));
  }

  /**
   * Polls YouTube for video processing completion.
   *
   * YouTube videos go through processing after upload. The `uploadStatus`
   * transitions from `uploaded` to `processed`. Polls every
   * {@link POLLING_INTERVAL_MS} up to {@link MAX_POLLING_ATTEMPTS}.
   *
   * @param video - The video entity (updated in-place with status changes)
   * @param accessToken - A valid access token for polling
   * @internal
   */
  private async waitForProcessingComplete(video: YouTubeVideo, accessToken: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
      const status = await this.youtubeApiService.getVideoStatus(
        accessToken,
        video.youtubeVideoId!,
      );

      this.logger.debug(
        `Video ${video.youtubeVideoId} status: ${status.status.uploadStatus} (attempt ${attempt + 1})`,
      );

      if (status.status.uploadStatus === 'processed') {
        return;
      }

      if (
        status.status.uploadStatus === 'failed' ||
        status.status.uploadStatus === 'rejected' ||
        status.status.uploadStatus === 'deleted'
      ) {
        const reason =
          status.status.failureReason || status.status.rejectionReason || 'Unknown reason';
        throw new Error(
          `Video ${video.youtubeVideoId} reached terminal status: ${status.status.uploadStatus} (${reason})`,
        );
      }

      await AsyncUtil.sleep(POLLING_INTERVAL_MS);
    }

    throw new Error(
      `Video ${video.youtubeVideoId} processing did not complete within ${MAX_POLLING_ATTEMPTS} attempts`,
    );
  }

  /**
   * Maps a {@link YouTubeVideo} entity to the public API response shape.
   *
   * @param video - The video entity from the database
   * @returns Sanitized video response
   * @internal
   */
  private toResponse(video: YouTubeVideo): VideoResponseModel {
    return {
      id: video.id,
      videoType: video.videoType,
      videoUrl: video.videoUrl,
      title: video.title,
      description: video.description,
      tags: video.tags,
      privacyStatus: video.privacyStatus,
      status: video.status,
      youtubeVideoId: video.youtubeVideoId,
      youtubeUrl: video.youtubeUrl,
      thumbnailUrl: video.thumbnailUrl,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    };
  }
}
