import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { google } from 'googleapis';
import { VideoInsertResponse, VideoStatusResponse } from '../types/youtube.type';

/**
 * Low-level YouTube Data API v3 client for video uploads and management.
 *
 * Handles:
 * 1. {@link uploadVideo} — Stream a video from a URL and upload to YouTube
 * 2. {@link getVideoStatus} — Poll a video's processing status
 * 3. {@link setThumbnail} — Stream an image from a URL and set as video thumbnail
 *
 * This service handles only API transport and error detection. Business logic
 * (polling loops, status tracking, error recovery) lives in {@link YouTubeService}.
 */
@Injectable()
export class YouTubeApiService {
  private readonly logger = new Logger(YouTubeApiService.name);

  /**
   * Uploads a video to YouTube.
   *
   * Streams the video from the provided URL and pipes it directly
   * to the YouTube `videos.insert` endpoint. For Shorts, `#Shorts`
   * is prepended to the description if not already present.
   *
   * @param accessToken - Valid Google OAuth access token
   * @param videoUrl - Publicly accessible URL of the video file
   * @param title - Video title
   * @param description - Video description (optional)
   * @param tags - Array of tag strings (optional)
   * @param privacyStatus - 'public' | 'private' | 'unlisted'
   * @param isShort - If true, ensures #Shorts is in the description
   * @returns Response with the YouTube video ID and status
   */
  async uploadVideo(
    accessToken: string,
    videoUrl: string,
    title: string,
    description: string | null,
    tags: string[] | null,
    privacyStatus: string,
    isShort: boolean,
  ): Promise<VideoInsertResponse> {
    const client = new google.auth.OAuth2();
    client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth: client });

    const videoStream = await this.streamFromUrl(videoUrl);

    let finalDescription = description ?? '';
    if (isShort && !finalDescription.includes('#Shorts')) {
      finalDescription = `#Shorts ${finalDescription}`.trim();
    }

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description: finalDescription || undefined,
          tags: tags ?? undefined,
        },
        status: {
          privacyStatus,
        },
      },
      media: {
        body: videoStream,
      },
    });

    if (!response.data.id) {
      throw new Error('YouTube video upload did not return a video ID');
    }

    this.logger.log(`Video uploaded to YouTube: ${response.data.id}`);

    return {
      id: response.data.id,
      status: {
        uploadStatus: response.data.status?.uploadStatus ?? 'uploaded',
        privacyStatus: response.data.status?.privacyStatus ?? privacyStatus,
      },
    };
  }

  /**
   * Checks the processing status of an uploaded video.
   *
   * Returns the current `uploadStatus` which can be:
   * - `uploaded` — Upload complete, processing pending
   * - `processed` — Fully processed, ready for viewing
   * - `failed` — Processing failed
   * - `rejected` — Rejected (policy violation, duplicate, etc.)
   * - `deleted` — Video was deleted
   *
   * @param accessToken - Valid Google OAuth access token
   * @param videoId - YouTube video ID to check
   * @returns The video's current processing status
   */
  async getVideoStatus(accessToken: string, videoId: string): Promise<VideoStatusResponse> {
    const client = new google.auth.OAuth2();
    client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth: client });

    const response = await youtube.videos.list({
      part: ['status'],
      id: [videoId],
    });

    const video = response.data.items?.[0];
    if (!video) {
      throw new Error(`Video ${videoId} not found on YouTube`);
    }

    return {
      id: video.id!,
      status: {
        uploadStatus:
          (video.status?.uploadStatus as VideoStatusResponse['status']['uploadStatus']) ??
          'uploaded',
        failureReason: video.status?.failureReason ?? undefined,
        rejectionReason: video.status?.rejectionReason ?? undefined,
      },
    };
  }

  /**
   * Sets a custom thumbnail on a YouTube video.
   *
   * Streams the image from the provided URL and uploads it via
   * the YouTube `thumbnails.set` endpoint.
   *
   * @param accessToken - Valid Google OAuth access token
   * @param videoId - YouTube video ID to set the thumbnail on
   * @param thumbnailUrl - Publicly accessible URL of the thumbnail image
   */
  async setThumbnail(accessToken: string, videoId: string, thumbnailUrl: string): Promise<void> {
    const client = new google.auth.OAuth2();
    client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth: client });

    const imageStream = await this.streamFromUrl(thumbnailUrl);

    await youtube.thumbnails.set({
      videoId,
      media: {
        body: imageStream,
      },
    });

    this.logger.log(`Thumbnail set for video ${videoId}`);
  }

  /**
   * Fetches a file from a URL and returns it as a Node.js Readable stream.
   *
   * The `googleapis` package requires a Node.js `Readable` stream for
   * `media.body`. This converts the web `ReadableStream` from `fetch()`
   * into a compatible format.
   *
   * @param url - Publicly accessible URL of the file
   * @returns A Node.js Readable stream of the file content
   */
  private async streamFromUrl(url: string): Promise<Readable> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch file from ${url}: HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error(`No response body received from ${url}`);
    }

    return Readable.fromWeb(response.body as import('stream/web').ReadableStream);
  }
}
