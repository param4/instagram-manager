export enum PostStatus {
  PENDING = 'pending',
  CONTAINER_CREATED = 'container_created',
  PROCESSING = 'processing',
  CONTAINER_FINISHED = 'container_finished',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export enum MediaType {
  IMAGE = 'image',
  REELS = 'reels',
}

export type ContainerStatusCode = 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED';

export type CreateContainerResponse = {
  id: string;
};

export type ContainerStatusResponse = {
  id: string;
  status_code: ContainerStatusCode;
};

export type PublishMediaResponse = {
  id: string;
};

export type GraphApiErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
};

// OAuth token exchange types
export type ShortLivedTokenResponse = {
  access_token: string;
  user_id: string;
};

export type LongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type TokenRefreshResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type InstagramUserProfile = {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
};
