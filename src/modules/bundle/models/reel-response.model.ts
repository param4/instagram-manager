/**
 * Public representation of a reel within a bundle.
 *
 * {@link url} and {@link thumbnailUrl} are signed URLs resolved at
 * read time from the provider-agnostic storage keys stored in the entity.
 */
export class ReelResponseModel {
  id: string;
  title: string | null;
  /** Signed download URL for the reel video */
  url: string;
  /** Signed download URL for the thumbnail, or null */
  thumbnailUrl: string | null;
  duration: number | null;
  position: number | null;
  createdAt: Date;
  updatedAt: Date;
}
