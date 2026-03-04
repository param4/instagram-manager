import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { AuthProviderInterface } from './auth-provider.interface';
import { VerifyTokenResult, RefreshTokenResult, UserInfo, AuthUser } from '../types/auth.type';

/** Authentication factor shape from Stytch session payload */
interface StytchAuthFactor {
  type: string;
  [key: string]: unknown;
}

/** Minimal Stytch user shape covering only the fields we access */
interface StytchUser {
  user_id: string;
  emails?: Array<{ email?: string; verified?: boolean }>;
  name?: { first_name?: string; last_name?: string } | null;
  totps?: unknown[];
  phone_numbers?: unknown[];
}

/** Minimal Stytch SDK shape for lazy-loaded stytch package */
interface StytchSDK {
  sessions: {
    authenticateJwt(params: {
      session_jwt: string;
    }): Promise<{ session?: Record<string, unknown> } & Record<string, unknown>>;
    authenticate(params: {
      session_token: string;
      session_duration_minutes: number;
    }): Promise<{ session_jwt: string; session: { expires_at: string } }>;
  };
  users: {
    get(params: { user_id: string }): Promise<{ user?: StytchUser } & Partial<StytchUser>>;
  };
}

@Injectable()
export class StytchProvider implements AuthProviderInterface {
  private readonly logger = new Logger(StytchProvider.name);
  private stytchClient: StytchSDK | null = null;

  readonly supportsRefresh = true;
  readonly supportsMfaClaims = true;

  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string): Promise<VerifyTokenResult> {
    await this.ensureInitialized();

    try {
      const result = await this.stytchClient!.sessions.authenticateJwt({
        session_jwt: token,
      });

      const payload = result.session ?? result;
      const user = this.normalizeUser(payload);
      return {
        user,
        expiresAt: payload.expires_at
          ? Math.floor(new Date(payload.expires_at as string).getTime() / 1000)
          : 0,
        rawPayload: payload,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired Stytch session');
    }
  }

  async refreshToken(sessionToken: string): Promise<RefreshTokenResult> {
    await this.ensureInitialized();

    try {
      const result = await this.stytchClient!.sessions.authenticate({
        session_token: sessionToken,
        session_duration_minutes: 60,
      });

      return {
        accessToken: result.session_jwt,
        expiresAt: Math.floor(new Date(result.session.expires_at).getTime() / 1000),
      };
    } catch {
      throw new UnauthorizedException('Failed to refresh Stytch session');
    }
  }

  async getUserInfo(userId: string): Promise<UserInfo> {
    await this.ensureInitialized();

    const result = await this.stytchClient!.users.get({ user_id: userId });
    const user: StytchUser = result.user ?? {
      user_id: result.user_id ?? userId,
      emails: result.emails,
      name: result.name,
      totps: result.totps,
      phone_numbers: result.phone_numbers,
    };
    return {
      id: user.user_id,
      email: user.emails?.[0]?.email ?? null,
      emailVerified: user.emails?.[0]?.verified ?? false,
      name: user.name ? `${user.name.first_name ?? ''} ${user.name.last_name ?? ''}`.trim() : null,
      picture: null,
      roles: [],
      permissions: [],
      orgId: null,
      mfaEnabled: (user.totps?.length ?? 0) > 0 || (user.phone_numbers?.length ?? 0) > 0,
      metadata: { raw: user },
    };
  }

  private normalizeUser(payload: Record<string, unknown>): AuthUser {
    const authFactors = (payload.authentication_factors as StytchAuthFactor[] | undefined) ?? [];
    const hasMfa = authFactors.some((f) => ['otp', 'totp', 'webauthn'].includes(f.type));

    return {
      id: (payload.user_id as string) ?? (payload.sub as string),
      email: (payload.email as string) ?? null,
      roles: (payload.roles as string[]) ?? [],
      permissions: (payload.permissions as string[]) ?? [],
      orgId: (payload.organization_id as string) ?? null,
      mfaVerified: hasMfa,
      metadata: { provider: 'stytch' },
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.stytchClient) return;

    try {
      const stytch = await import('stytch');
      this.stytchClient = new stytch.Client({
        project_id: this.configService.stytchProjectId,
        secret: this.configService.stytchSecret,
        env: this.configService.isProduction ? stytch.envs.live : stytch.envs.test,
      }) as unknown as StytchSDK;
      this.logger.log('Stytch provider initialized');
    } catch {
      throw new Error('Stytch provider requires "stytch" package. Run: pnpm add stytch');
    }
  }
}
