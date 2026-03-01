import { PostStatus, MediaType } from '../types/instagram.type';

/**
 * Public representation of an Instagram post.
 *
 * Returned by all post-related endpoints. Contains the post's
 * current lifecycle status and metadata, but excludes internal
 * fields like `containerId` and `errorMessage`.
 */
export class PostResponseModel {
  /** Internal UUID of the post */
  id: string;

  /** Whether this is an image or reel */
  mediaType: MediaType;

  /** URL of the media file that was published */
  mediaUrl: string;

  /** Caption text, or `null` if no caption was provided */
  caption: string | null;

  /** Current lifecycle status of the post */
  status: PostStatus;

  /** Instagram media ID assigned after publishing, or `null` if not yet published */
  instagramMediaId: string | null;

  /** Permanent URL to the post on Instagram, or `null` if not available */
  permalink: string | null;

  /** When the post record was created */
  createdAt: Date;

  /** When the post record was last updated */
  updatedAt: Date;
}
