import { BundleStatus } from '../types/bundle.type';
import { ReelResponseModel } from './reel-response.model';

/**
 * Public representation of a bundle.
 *
 * The {@link reels} array is populated when fetching a single bundle
 * and omitted in list responses to keep payloads lightweight.
 *
 * {@link thumbnailUrl} is a signed URL resolved from the stored
 * provider-agnostic storage key.
 */
export class BundleResponseModel {
  id: string;
  title: string;
  description: string | null;
  status: BundleStatus;
  /** Signed download URL for the bundle cover image, or null */
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  categories: string | null;
  reels?: ReelResponseModel[];
  createdAt: Date;
  updatedAt: Date;
}
