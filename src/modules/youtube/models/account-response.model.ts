/**
 * Public representation of a connected YouTube account.
 *
 * Returned by account-related endpoints. Excludes sensitive fields
 * such as the OAuth access token and refresh token.
 */
export class AccountResponseModel {
  /** Internal UUID of the account */
  id: string;

  /** YouTube channel ID */
  channelId: string;

  /** Channel title / display name */
  channelTitle: string;

  /** Channel custom URL (e.g. @username) */
  customUrl: string | null;

  /** Channel thumbnail URL */
  thumbnailUrl: string | null;

  /** When the current access token expires */
  tokenExpiresAt: Date;

  /** When the account was first connected */
  createdAt: Date;
}
