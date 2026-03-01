/**
 * Public representation of a connected Instagram account.
 *
 * Returned by account-related endpoints. Excludes sensitive fields
 * such as the OAuth access token.
 */
export class AccountResponseModel {
  /** Internal UUID of the account */
  id: string;

  /** Instagram user ID from the platform */
  igUserId: string;

  /** Instagram username */
  username: string;

  /** Display name from the Instagram profile */
  name: string | null;

  /** URL of the user's profile picture */
  profilePictureUrl: string | null;

  /** When the current access token expires */
  tokenExpiresAt: Date;

  /** Whether the account is currently active */
  isActive: boolean;

  /** When the account was first connected */
  createdAt: Date;
}
