import { Injectable, Logger, UnauthorizedException, NotImplementedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
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
  users: {
    getUser(userId: string): Promise<ClerkUser>;
    getUserList(params: Record<string, unknown>): Promise<{ data: ClerkUser[] }>;
    createUser(params: Record<string, unknown>): Promise<ClerkUser>;
    deleteUser(userId: string): Promise<void>;
    updateUser(userId: string, params: Record<string, unknown>): Promise<ClerkUser>;
    verifyPassword(params: { userId: string; password: string }): Promise<{ verified: boolean }>;
  };
}

/** Custom JWT payload issued by our login endpoint */
interface CustomJwtPayload {
  sub: string;
  email: string | null;
  iss: string;
  exp: number;
  iat: number;
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
  readonly supportsUserManagement = true;
  readonly supportsLogin = true;

  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string): Promise<VerifyTokenResult> {
    await this.ensureInitialized();

    // Try Clerk session token first
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
      // Fall through to custom JWT check
    }

    // Try our custom JWT (issued by login endpoint)
    try {
      const payload = jwt.verify(token, this.configService.clerkSecretKey) as CustomJwtPayload;
      if (payload.iss !== 'insta-uploader') {
        throw new Error('Invalid issuer');
      }
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        roles: [],
        permissions: [],
        orgId: null,
        mfaVerified: false,
        metadata: { provider: 'clerk', tokenType: 'custom' },
      };
      return {
        user,
        expiresAt: payload.exp,
        rawPayload: payload as unknown as Record<string, unknown>,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
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

  async createUser(params: CreateUserParams): Promise<CreateUserResult> {
    await this.ensureInitialized();
    const nameParts = params.name.split(' ');
    const user = await this.clerkClient!.users.createUser({
      emailAddress: [params.email],
      firstName: nameParts[0] ?? params.name,
      lastName: nameParts.slice(1).join(' ') || undefined,
      password: params.password,
      username: params.username,
      phoneNumber: params.phoneNumber ? [params.phoneNumber] : undefined,
    });
    return { authProviderId: user.id };
  }

  async deleteUser(authProviderId: string): Promise<void> {
    await this.ensureInitialized();
    await this.clerkClient!.users.deleteUser(authProviderId);
  }

  async login(params: LoginParams): Promise<LoginResult> {
    await this.ensureInitialized();

    // Find user by email
    const byEmail = await this.clerkClient!.users.getUserList({
      emailAddress: [params.identifier],
      limit: 1,
    });
    let user = byEmail.data?.[0];

    // Fall back to username search
    if (!user) {
      const byUsername = await this.clerkClient!.users.getUserList({
        username: [params.identifier],
        limit: 1,
      });
      user = byUsername.data?.[0];
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password via Clerk Backend API
    try {
      const verified = await this.clerkClient!.users.verifyPassword({
        userId: user.id,
        password: params.password,
      });

      if (!verified?.verified) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Issue our own JWT signed with the Clerk secret key
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const email = user.emailAddresses?.[0]?.emailAddress ?? null;
    const token = jwt.sign(
      { sub: user.id, email, iss: 'insta-uploader' },
      this.configService.clerkSecretKey,
      { expiresIn: '1h' },
    );

    return { token, userId: user.id, expiresAt };
  }

  async updateUser(authProviderId: string, params: UpdateUserParams): Promise<void> {
    await this.ensureInitialized();
    const update: Record<string, unknown> = {};
    if (params.name) {
      const parts = params.name.split(' ');
      update.firstName = parts[0];
      update.lastName = parts.slice(1).join(' ') || undefined;
    }
    await this.clerkClient!.users.updateUser(authProviderId, update);
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
