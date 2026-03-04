import { VerifyTokenResult, RefreshTokenResult, UserInfo } from '../types/auth.type';

/**
 * Common interface for all authentication providers.
 *
 * Each provider (Auth0, Clerk, WorkOS, Stytch, Zitadel) implements this
 * interface. The auth service and guards only interact with this interface,
 * never with provider-specific code directly.
 */
export interface AuthProviderInterface {
  /**
   * Verifies a Bearer token and returns the normalized user identity.
   * @throws UnauthorizedException if the token is invalid or expired
   */
  verifyToken(token: string): Promise<VerifyTokenResult>;

  /**
   * Refreshes an access token using a refresh token.
   * @throws NotImplementedException if the provider doesn't support refresh
   */
  refreshToken(refreshToken: string): Promise<RefreshTokenResult>;

  /**
   * Retrieves detailed user information from the provider's API.
   */
  getUserInfo(userId: string, accessToken: string): Promise<UserInfo>;

  /** Whether this provider supports server-side token refresh */
  readonly supportsRefresh: boolean;

  /** Whether this provider includes MFA status in its JWT claims */
  readonly supportsMfaClaims: boolean;
}

/** Injection token for the auth provider */
export const AUTH_PROVIDER_TOKEN = Symbol('AUTH_PROVIDER_TOKEN');
