/**
 * Lifecycle status of a YouTube video upload.
 *
 * Videos transition through these states in order:
 * `PENDING` -> `UPLOADING` -> `PROCESSING` -> `PUBLISHED`
 *
 * `FAILED` is a terminal state reached when any step encounters an error.
 */
export enum VideoStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

/**
 * Supported YouTube video types.
 *
 * - `VIDEO` — Standard long-form video
 * - `SHORT` — YouTube Shorts (under 60s, vertical 9:16)
 */
export enum VideoType {
  VIDEO = 'video',
  SHORT = 'short',
}

/** Human-readable label for each {@link VideoType}, used in API response messages */
export const VideoTypeLabel: Record<VideoType, string> = {
  [VideoType.VIDEO]: 'video',
  [VideoType.SHORT]: 'Short',
};

/**
 * YouTube video privacy status.
 */
export enum PrivacyStatus {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

// ── Google OAuth response types ──────────────────────────────────────────────

/** YouTube channel profile from `channels.list(mine=true)` */
export type YouTubeChannelProfile = {
  channelId: string;
  title: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
};

// ── YouTube API response types ───────────────────────────────────────────────

/** Response from `videos.insert` */
export type VideoInsertResponse = {
  id: string;
  status: {
    uploadStatus: string;
    privacyStatus: string;
  };
};

/**
 * Possible `uploadStatus` values returned by `videos.list`.
 * - `uploaded` — Upload complete, processing hasn't started
 * - `processed` — Fully processed, ready for viewing
 * - `failed` — Processing failed
 * - `rejected` — Rejected (e.g. duplicate, policy violation)
 * - `deleted` — Video was deleted
 */
export type UploadStatus = 'uploaded' | 'processed' | 'failed' | 'rejected' | 'deleted';

/** Response shape from `videos.list` for status polling */
export type VideoStatusResponse = {
  id: string;
  status: {
    uploadStatus: UploadStatus;
    failureReason?: string;
    rejectionReason?: string;
  };
};
