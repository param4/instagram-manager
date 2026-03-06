import { Injectable, Logger, UnauthorizedException, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { AuthProviderInterface } from './auth-provider.interface';
import {
  VerifyTokenResult,
  RefreshTokenResult,
  UserInfo,
  AuthUser,
  CreateUserParams,
  CreateUserResult,
  UpdateUserParams,
  LoginParams,
  LoginResult,
} from '../types/auth.type';

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
    createUser(params: {
      email: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    }): Promise<WorkOSUser>;
    deleteUser(userId: string): Promise<void>;
    updateUser(params: {
      userId: string;
      firstName?: string;
      lastName?: string;
    }): Promise<WorkOSUser>;
  };
}

@Injectable()
export class WorkOSProvider implements AuthProviderInterface {
  private readonly logger = new Logger(WorkOSProvider.name);
  private workos: WorkOSSDK | null = null;

  readonly supportsRefresh = true;
  readonly supportsLogin = false;
  readonly supportsMfaClaims = true;
  readonly supportsUserManagement = true;

  constructor(private readonly configService: ConfigService) {}

  async login(_params: LoginParams): Promise<LoginResult> {
    throw new NotImplementedException('Login is not supported by this provider');
  }

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

  async createUser(params: CreateUserParams): Promise<CreateUserResult> {
    await this.ensureInitialized();
    const nameParts = params.name.split(' ');
    const user = await this.workos!.userManagement.createUser({
      email: params.email,
      password: params.password,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || undefined,
    });
    return { authProviderId: user.id };
  }

  async deleteUser(authProviderId: string): Promise<void> {
    await this.ensureInitialized();
    await this.workos!.userManagement.deleteUser(authProviderId);
  }

  async updateUser(authProviderId: string, params: UpdateUserParams): Promise<void> {
    await this.ensureInitialized();
    const update: Record<string, unknown> = { userId: authProviderId };
    if (params.name) {
      const parts = params.name.split(' ');
      update.firstName = parts[0];
      update.lastName = parts.slice(1).join(' ') || undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    await this.workos!.userManagement.updateUser(update as any);
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
