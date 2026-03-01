import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import {
  CreateContainerResponse,
  ContainerStatusResponse,
  PublishMediaResponse,
  GraphApiErrorResponse,
  MediaType,
} from '../types/instagram.type';

/**
 * Low-level HTTP client for the Instagram Graph API content publishing endpoints.
 *
 * Wraps the three-step container-based publishing flow:
 * 1. {@link createMediaContainer} — Create a media container (image or reel)
 * 2. {@link getContainerStatus} — Poll container processing status
 * 3. {@link publishContainer} — Publish the finished container to the user's feed
 *
 * This service handles only HTTP transport and error detection. Business logic
 * (polling loops, status tracking, error recovery) lives in {@link InstagramService}.
 */
@Injectable()
export class InstagramApiService {
  private readonly logger = new Logger(InstagramApiService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = `https://graph.instagram.com/${configService.igApiVersion}`;
  }

  /**
   * Creates a media container on the Instagram API.
   *
   * For images, sets `image_url` on the container. For reels, sets `video_url`
   * and `media_type=REELS`. The container enters a processing pipeline on
   * Instagram's servers and must be polled via {@link getContainerStatus}
   * before it can be published.
   *
   * @param igUserId - The Instagram user ID that owns the media
   * @param accessToken - A valid access token for the user
   * @param mediaUrl - Publicly accessible URL of the image or video
   * @param mediaType - Whether this is an image or a reel
   * @param caption - Optional caption text for the post
   * @returns The created container with its ID
   */
  async createMediaContainer(
    igUserId: string,
    accessToken: string,
    mediaUrl: string,
    mediaType: MediaType = MediaType.IMAGE,
    caption?: string,
  ): Promise<CreateContainerResponse> {
    const params = new URLSearchParams({
      access_token: accessToken,
    });

    if (mediaType === MediaType.REELS) {
      params.set('video_url', mediaUrl);
      params.set('media_type', 'REELS');
    } else {
      params.set('image_url', mediaUrl);
    }

    if (caption) {
      params.set('caption', caption);
    }

    const url = `${this.baseUrl}/${igUserId}/media?${params.toString()}`;
    const response = await fetch(url, { method: 'POST' });
    const data = (await response.json()) as CreateContainerResponse | GraphApiErrorResponse;

    if (!response.ok) {
      const error = data as GraphApiErrorResponse;
      this.logger.error(`Container creation failed: ${error.error.message}`);
      throw new Error(`Container creation failed: ${error.error.message}`);
    }

    return data as CreateContainerResponse;
  }

  /**
   * Polls the processing status of a media container.
   *
   * Returns the current `status_code` which can be:
   * - `IN_PROGRESS` — Still processing (keep polling)
   * - `FINISHED` — Ready to publish
   * - `ERROR` — Processing failed permanently
   * - `EXPIRED` — Container expired before publishing
   *
   * @param accessToken - A valid access token
   * @param containerId - The container ID returned from {@link createMediaContainer}
   * @returns The container's current status
   */
  async getContainerStatus(
    accessToken: string,
    containerId: string,
  ): Promise<ContainerStatusResponse> {
    const params = new URLSearchParams({
      fields: 'status_code',
      access_token: accessToken,
    });

    const url = `${this.baseUrl}/${containerId}?${params.toString()}`;
    const response = await fetch(url, { method: 'GET' });
    const data = (await response.json()) as ContainerStatusResponse | GraphApiErrorResponse;

    if (!response.ok) {
      const error = data as GraphApiErrorResponse;
      this.logger.error(`Container status check failed: ${error.error.message}`);
      throw new Error(`Container status check failed: ${error.error.message}`);
    }

    return data as ContainerStatusResponse;
  }

  /**
   * Publishes a finished media container to the user's Instagram feed.
   *
   * This is the final step in the publishing flow. The container must
   * have a `FINISHED` status before calling this method.
   *
   * @param igUserId - The Instagram user ID that owns the media
   * @param accessToken - A valid access token for the user
   * @param containerId - The finished container ID to publish
   * @returns The published media with its Instagram media ID
   */
  async publishContainer(
    igUserId: string,
    accessToken: string,
    containerId: string,
  ): Promise<PublishMediaResponse> {
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    const url = `${this.baseUrl}/${igUserId}/media_publish?${params.toString()}`;
    const response = await fetch(url, { method: 'POST' });
    const data = (await response.json()) as PublishMediaResponse | GraphApiErrorResponse;

    if (!response.ok) {
      const error = data as GraphApiErrorResponse;
      this.logger.error(`Media publish failed: ${error.error.message}`);
      throw new Error(`Media publish failed: ${error.error.message}`);
    }

    return data as PublishMediaResponse;
  }
}
