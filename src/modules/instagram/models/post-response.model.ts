import { PostStatus, MediaType } from '../types/instagram.type';

export class PostResponseModel {
  id: string;
  mediaType: MediaType;
  mediaUrl: string;
  caption: string | null;
  status: PostStatus;
  instagramMediaId: string | null;
  permalink: string | null;
  createdAt: Date;
  updatedAt: Date;
}
