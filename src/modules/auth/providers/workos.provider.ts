import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { AuthProviderInterface } from './auth-provider.interface';
import { VerifyTokenResult, RefreshTokenResult, UserInfo, AuthUser } from '../types/auth.type';

/** Minimal WorkOS user shape covering only the fields we access */
interface WorkOSUser {
  id: string;
  email?: string | null;
  emailVerified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
  mfaEnabled?: boolean;
}

/** Minimal WorkOS refresh result shape */
interface WorkOSRefreshResult {
  accessToken: string;
  expiresIn?: number;
}

/** Minimal WorkOS SDK shape for lazy-loaded @workos-inc/node */
interface WorkOSSDK {
  userManagement: {
    authenticateWithRefreshToken(params: {
      refreshToken: string;
      clientId: string;
    }): Promise<WorkOSRefreshResult>;
    getUser(userId: string): Promise<WorkOSUser>;
  };
}

@Injectable()
export class WorkOSProvider implements AuthProviderInterface {
  private readonly logger = new Logger(WorkOSProvider.name);
  private workos: WorkOSSDK | null = null;

  readonly supportsRefresh = true;
  readonly supportsMfaClaims = true;

  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string): Promise<VerifyTokenResult> {
    await this.ensureInitialized();

    try {
      const jose = await import('jose');
      const jwksUrl = `https://api.workos.com/sso/jwks/${this.configService.workosClientId}`;
      const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));

      const { payload: verified } = await jose.jwtVerify(token, JWKS, {
        issuer: 'https://api.workos.com/',
      });

      const verifiedPayload = verified as Record<string, unknown>;
      const user = this.normalizeUser(verifiedPayload);

      return {
        user,
        expiresAt: (verifiedPayload.exp as number) ?? 0,
        rawPayload: verifiedPayload,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired WorkOS token');
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    await this.ensureInitialized();

    try {
      const result = await this.workos!.userManagement.authenticateWithRefreshToken({
        refreshToken,
        clientId: this.configService.workosClientId,
      });

      return {
        accessToken: result.accessToken,
        expiresAt: Math.floor(Date.now() / 1000) + (result.expiresIn ?? 3600),
      };
    } catch {
      throw new UnauthorizedException('Failed to refresh WorkOS token');
    }
  }

  async getUserInfo(userId: string): Promise<UserInfo> {
    await this.ensureInitialized();

    const user = await this.workos!.userManagement.getUser(userId);
    return {
      id: user.id,
      email: user.email ?? null,
      emailVerified: user.emailVerified ?? false,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      picture: user.profilePictureUrl ?? null,
      roles: [],
      permissions: [],
      orgId: null,
      mfaEnabled: user.mfaEnabled ?? false,
      metadata: { raw: user },
    };
  }

  private normalizeUser(payload: Record<string, unknown>): AuthUser {
    const amr = payload.amr as string[] | undefined;
    return {
      id: payload.sub as string,
      email: (payload.email as string) ?? null,
      roles: payload.role ? [payload.role as string] : [],
      permissions: (payload.permissions as string[]) ?? [],
      orgId: (payload.org_id as string) ?? null,
      mfaVerified: amr ? amr.includes('mfa') : false,
      metadata: { provider: 'workos' },
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.workos) return;

    try {
      const { WorkOS } = await import('@workos-inc/node');
      this.workos = new WorkOS(this.configService.workosApiKey) as unknown as WorkOSSDK;
      this.logger.log('WorkOS provider initialized');
    } catch {
      throw new Error(
        'WorkOS provider requires "@workos-inc/node" package. Run: pnpm add @workos-inc/node',
      );
    }
  }
}
