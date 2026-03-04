import { Injectable, Logger, UnauthorizedException, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { AuthProviderInterface } from './auth-provider.interface';
import { VerifyTokenResult, RefreshTokenResult, UserInfo, AuthUser } from '../types/auth.type';

/** Minimal Clerk user shape covering only the fields we access */
interface ClerkUser {
  id: string;
  emailAddresses?: Array<{ emailAddress?: string; verification?: { status?: string } }>;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  twoFactorEnabled?: boolean;
  publicMetadata?: Record<string, unknown>;
}

/** Minimal Clerk SDK shape for lazy-loaded @clerk/backend */
interface ClerkSDK {
  users: { getUser(userId: string): Promise<ClerkUser> };
}

/** Clerk verifyToken function signature */
type ClerkVerifyTokenFn = (
  token: string,
  options: { secretKey: string },
) => Promise<Record<string, unknown>>;

@Injectable()
export class ClerkProvider implements AuthProviderInterface {
  private readonly logger = new Logger(ClerkProvider.name);
  private clerkClient: ClerkSDK | null = null;
  private verifyTokenFn: ClerkVerifyTokenFn | null = null;

  readonly supportsRefresh = false;
  readonly supportsMfaClaims = false;

  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string): Promise<VerifyTokenResult> {
    await this.ensureInitialized();

    try {
      const payload = await this.verifyTokenFn!(token, {
        secretKey: this.configService.clerkSecretKey,
      });

      const user = this.normalizeUser(payload);
      return {
        user,
        expiresAt: (payload.exp as number) ?? 0,
        rawPayload: payload,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired Clerk token');
    }
  }

  refreshToken(): Promise<RefreshTokenResult> {
    return Promise.reject(new NotImplementedException('Clerk manages sessions client-side'));
  }

  async getUserInfo(userId: string): Promise<UserInfo> {
    await this.ensureInitialized();

    const user = await this.clerkClient!.users.getUser(userId);
    return {
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress ?? null,
      emailVerified: user.emailAddresses?.[0]?.verification?.status === 'verified',
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      picture: user.imageUrl ?? null,
      roles: [],
      permissions: [],
      orgId: null,
      mfaEnabled: user.twoFactorEnabled ?? false,
      metadata: { publicMetadata: user.publicMetadata },
    };
  }

  private normalizeUser(payload: Record<string, unknown>): AuthUser {
    return {
      id: payload.sub as string,
      email: (payload.email as string) ?? null,
      roles: payload.org_role ? [payload.org_role as string] : [],
      permissions: (payload.org_permissions as string[]) ?? [],
      orgId: (payload.org_id as string) ?? null,
      mfaVerified: false,
      metadata: { provider: 'clerk' },
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.clerkClient) return;

    try {
      const clerk = await import('@clerk/backend');
      this.clerkClient = clerk.createClerkClient({
        secretKey: this.configService.clerkSecretKey,
      }) as unknown as ClerkSDK;
      this.verifyTokenFn = clerk.verifyToken as unknown as ClerkVerifyTokenFn;
      this.logger.log('Clerk provider initialized');
    } catch {
      throw new Error(
        'Clerk provider requires "@clerk/backend" package. Run: pnpm add @clerk/backend',
      );
    }
  }
}
