/**
 * Lifecycle status of an Instagram post.
 *
 * Posts transition through these states in order:
 * `PENDING` -> `CONTAINER_CREATED` -> `PROCESSING` -> `CONTAINER_FINISHED` -> `PUBLISHED`
 *
 * `FAILED` is a terminal state reached when any step encounters an error.
 */
export enum PostStatus {
  PENDING = 'pending',
  CONTAINER_CREATED = 'container_created',
  PROCESSING = 'processing',
  CONTAINER_FINISHED = 'container_finished',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

/**
 * Supported Instagram media types.
 *
 * - `IMAGE` — Single photo post
 * - `REELS` — Short-form video (reel)
 */
export enum MediaType {
  IMAGE = 'image',
  REELS = 'reels',
}

/** Possible `status_code` values returned by the Instagram container status endpoint */
export type ContainerStatusCode = 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED';

/** Response from `POST /{user-id}/media` — creates a media container */
export type CreateContainerResponse = {
  id: string;
};

/** Response from `GET /{container-id}?fields=status_code` — polls container status */
export type ContainerStatusResponse = {
  id: string;
  status_code: ContainerStatusCode;
};

/** Response from `POST /{user-id}/media_publish` — publishes a finished container */
export type PublishMediaResponse = {
  id: string;
};

/** Standard error response from the Instagram Graph API */
export type GraphApiErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
};

// ── OAuth token exchange types ──────────────────────────────────────────────

/** Response from the short-lived token exchange (`POST /oauth/access_token`) */
export type ShortLivedTokenResponse = {
  access_token: string;
  user_id: string;
};

/** Response from the long-lived token exchange (`GET /access_token?grant_type=ig_exchange_token`) */
export type LongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

/** Response from the token refresh endpoint (`GET /refresh_access_token`) */
export type TokenRefreshResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

/** Instagram user profile fields returned by `GET /me` */
export type InstagramUserProfile = {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
};
