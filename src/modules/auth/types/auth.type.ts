/**
 * Supported authentication providers.
 * The AUTH_PROVIDER env var must match one of these values.
 */
export enum AuthProvider {
  AUTH0 = 'auth0',
  CLERK = 'clerk',
  WORKOS = 'workos',
  STYTCH = 'stytch',
  ZITADEL = 'zitadel',
}

/**
 * Normalized user identity extracted from any provider's JWT.
 *
 * Every provider returns different claim shapes. All providers
 * normalize to this common shape so downstream code never knows
 * which provider is active.
 */
export type AuthUser = {
  /** Provider-specific user ID (e.g., Auth0's `sub`, Clerk's `userId`) */
  id: string;

  /** User's primary email address, if available */
  email: string | null;

  /** Normalized roles from the provider's claims */
  roles: string[];

  /** Normalized permissions from the provider's claims */
  permissions: string[];

  /** Organization ID if multi-tenancy is enabled in the provider */
  orgId: string | null;

  /** Whether multi-factor authentication was used for this session */
  mfaVerified: boolean;

  /** Provider-specific metadata (raw claims that don't map to standard fields) */
  metadata: Record<string, unknown>;
};

/** Result of a token verification by any provider */
export type VerifyTokenResult = {
  /** The normalized user identity */
  user: AuthUser;

  /** When the token expires (epoch seconds from the `exp` claim) */
  expiresAt: number;

  /** Raw decoded JWT payload (provider-specific shape) */
  rawPayload: Record<string, unknown>;
};

/** Result of a token refresh operation */
export type RefreshTokenResult = {
  accessToken: string;
  expiresAt: number;
};

/** User info as returned by the provider's userinfo endpoint or equivalent API */
export type UserInfo = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  roles: string[];
  permissions: string[];
  orgId: string | null;
  mfaEnabled: boolean;
  metadata: Record<string, unknown>;
};
