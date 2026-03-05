import { VideoStatus, VideoType, PrivacyStatus } from '../types/youtube.type';

/**
 * Public representation of a YouTube video upload.
 *
 * Returned by all video-related endpoints. Contains the video's
 * current lifecycle status and metadata.
 */
export class VideoResponseModel {
  /** Internal UUID of the video */
  id: string;

  /** Whether this is a standard video or a Short */
  videoType: VideoType;

  /** Source URL of the video file */
  videoUrl: string;

  /** Video title */
  title: string;

  /** Video description, or `null` if not provided */
  description: string | null;

  /** Comma-separated tags, or `null` if not provided */
  tags: string | null;

  /** Privacy status of the video */
  privacyStatus: PrivacyStatus;

  /** Current lifecycle status of the video */
  status: VideoStatus;

  /** YouTube video ID assigned after upload, or `null` if not yet uploaded */
  youtubeVideoId: string | null;

  /** Full YouTube URL to the video, or `null` if not yet published */
  youtubeUrl: string | null;

  /** Custom thumbnail URL, or `null` if not set */
  thumbnailUrl: string | null;

  /** When the video record was created */
  createdAt: Date;

  /** When the video record was last updated */
  updatedAt: Date;
}
