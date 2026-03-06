import {
  VerifyTokenResult,
  RefreshTokenResult,
  UserInfo,
  CreateUserParams,
  CreateUserResult,
  UpdateUserParams,
  LoginParams,
  LoginResult,
} from '../types/auth.type';

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

  /**
   * Creates a user in the auth provider.
   * @throws NotImplementedException if the provider doesn't support user management
   */
  createUser(params: CreateUserParams): Promise<CreateUserResult>;

  /**
   * Deletes a user from the auth provider.
   * @throws NotImplementedException if the provider doesn't support user management
   */
  deleteUser(authProviderId: string): Promise<void>;

  /**
   * Updates a user in the auth provider.
   * @throws NotImplementedException if the provider doesn't support user management
   */
  updateUser(authProviderId: string, params: UpdateUserParams): Promise<void>;

  /**
   * Authenticates a user with identifier (email/username) and password.
   * Returns a session token.
   * @throws NotImplementedException if the provider doesn't support login
   */
  login(params: LoginParams): Promise<LoginResult>;

  /** Whether this provider supports server-side token refresh */
  readonly supportsRefresh: boolean;

  /** Whether this provider includes MFA status in its JWT claims */
  readonly supportsMfaClaims: boolean;

  /** Whether this provider supports server-side user management */
  readonly supportsUserManagement: boolean;

  /** Whether this provider supports server-side login */
  readonly supportsLogin: boolean;
}

/** Injection token for the auth provider */
export const AUTH_PROVIDER_TOKEN = Symbol('AUTH_PROVIDER_TOKEN');
