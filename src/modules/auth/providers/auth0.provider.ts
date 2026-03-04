import { Injectable, Logger, UnauthorizedException, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { AuthProviderInterface } from './auth-provider.interface';
import { VerifyTokenResult, RefreshTokenResult, UserInfo, AuthUser } from '../types/auth.type';

/** Minimal JWKS signing key shape for lazy-loaded jwks-rsa */
interface JwksSigningKey {
  getPublicKey(): string;
}

/** Minimal JWKS client shape for lazy-loaded jwks-rsa */
interface JwksClientInstance {
  getSigningKey(kid?: string): Promise<JwksSigningKey>;
}

/** JWT verify function signature for lazy-loaded jsonwebtoken */
type JwtVerifyFn = (
  token: string,
  secretOrPublicKey: string,
  options: { algorithms: string[]; audience: string; issuer: string },
) => Record<string, unknown>;

/** JWT decode result when called with { complete: true } */
interface JwtDecoded {
  header: { kid?: string };
  payload: Record<string, unknown>;
}

/** JWT decode function signature for lazy-loaded jsonwebtoken */
type JwtDecodeFn = (token: string, options: { complete: boolean }) => JwtDecoded | string | null;

@Injectable()
export class Auth0Provider implements AuthProviderInterface {
  private readonly logger = new Logger(Auth0Provider.name);
  private jwksClient: JwksClientInstance | null = null;
  private jwtVerify: JwtVerifyFn | null = null;
  private jwtDecode: JwtDecodeFn | null = null;

  readonly supportsRefresh = false;
  readonly supportsMfaClaims = true;

  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string): Promise<VerifyTokenResult> {
    await this.ensureInitialized();

    const decoded = this.jwtDecode!(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new UnauthorizedException('Invalid token format');
    }

    const key = await this.jwksClient!.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    const payload = this.jwtVerify!(token, signingKey, {
      algorithms: ['RS256'],
      audience: this.configService.auth0Audience,
      issuer: `https://${this.configService.auth0Domain}/`,
    });

    const user = this.normalizeUser(payload);

    return {
      user,
      expiresAt: (payload.exp as number) ?? 0,
      rawPayload: payload,
    };
  }

  refreshToken(): Promise<RefreshTokenResult> {
    return Promise.reject(
      new NotImplementedException('Auth0 token refresh is handled client-side'),
    );
  }

  async getUserInfo(userId: string, accessToken: string): Promise<UserInfo> {
    const domain = this.configService.auth0Domain;
    const res = await fetch(`https://${domain}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException('Failed to fetch user info from Auth0');
    }
    const data = (await res.json()) as Record<string, unknown>;
    return {
      id: (data.sub as string) ?? userId,
      email: (data.email as string) ?? null,
      emailVerified: (data.email_verified as boolean) ?? false,
      name: (data.name as string) ?? null,
      picture: (data.picture as string) ?? null,
      roles: this.extractRoles(data),
      permissions: this.extractPermissions(data),
      orgId: (data.org_id as string) ?? null,
      mfaEnabled: false,
      metadata: data,
    };
  }

  private normalizeUser(payload: Record<string, unknown>): AuthUser {
    const amr = payload.amr as string[] | undefined;
    return {
      id: payload.sub as string,
      email:
        (payload.email as string) ??
        (payload[`https://${this.configService.auth0Domain}/email`] as string) ??
        null,
      roles: this.extractRoles(payload),
      permissions: this.extractPermissions(payload),
      orgId: (payload.org_id as string) ?? null,
      mfaVerified: amr ? amr.includes('mfa') : false,
      metadata: { provider: 'auth0' },
    };
  }

  private extractRoles(payload: Record<string, unknown>): string[] {
    const namespace = this.configService.auth0Namespace;
    const rolesKey = `${namespace}/roles`;
    return (payload[rolesKey] as string[]) ?? (payload.roles as string[]) ?? [];
  }

  private extractPermissions(payload: Record<string, unknown>): string[] {
    return (payload.permissions as string[]) ?? [];
  }

  private async ensureInitialized(): Promise<void> {
    if (this.jwksClient) return;

    try {
      const jwksRsa = await import('jwks-rsa');
      const jwt = await import('jsonwebtoken');

      this.jwtVerify = jwt.verify as unknown as JwtVerifyFn;
      this.jwtDecode = jwt.decode as unknown as JwtDecodeFn;
      this.jwksClient = jwksRsa.default({
        jwksUri: `https://${this.configService.auth0Domain}/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: 600000,
        rateLimit: true,
      }) as unknown as JwksClientInstance;

      this.logger.log('Auth0 provider initialized');
    } catch {
      throw new Error(
        'Auth0 provider requires "jwks-rsa" and "jsonwebtoken" packages. Run: pnpm add jwks-rsa jsonwebtoken',
      );
    }
  }
}
