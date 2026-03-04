import { Injectable, Inject, Logger, NotImplementedException } from '@nestjs/common';
import { AuthProviderInterface, AUTH_PROVIDER_TOKEN } from '../providers/auth-provider.interface';
import { VerifyTokenResult, RefreshTokenResult, UserInfo } from '../types/auth.type';

/**
 * Authentication orchestration service.
 *
 * Delegates all operations to the configured AuthProviderInterface.
 * Controllers call this service; it never contains provider-specific logic.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_PROVIDER_TOKEN)
    private readonly authProvider: AuthProviderInterface,
  ) {}

  /** Verifies a Bearer token */
  async verifyToken(token: string): Promise<VerifyTokenResult> {
    return this.authProvider.verifyToken(token);
  }

  /** Refreshes an access token. Only available if the provider supports it */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    if (!this.authProvider.supportsRefresh) {
      throw new NotImplementedException(
        'Token refresh is not supported by the current auth provider',
      );
    }
    return this.authProvider.refreshToken(refreshToken);
  }

  /** Retrieves detailed user information from the auth provider */
  async getUserInfo(userId: string, accessToken: string): Promise<UserInfo> {
    return this.authProvider.getUserInfo(userId, accessToken);
  }

  /** Whether the current provider supports server-side token refresh */
  get supportsRefresh(): boolean {
    return this.authProvider.supportsRefresh;
  }

  /** Whether the current provider includes MFA claims in JWTs */
  get supportsMfaClaims(): boolean {
    return this.authProvider.supportsMfaClaims;
  }
}
