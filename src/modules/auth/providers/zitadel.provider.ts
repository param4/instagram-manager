import { Injectable, Logger, UnauthorizedException, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { AuthProviderInterface } from './auth-provider.interface';
import { VerifyTokenResult, RefreshTokenResult, UserInfo, AuthUser } from '../types/auth.type';

@Injectable()
export class ZitadelProvider implements AuthProviderInterface {
  private readonly logger = new Logger(ZitadelProvider.name);
  private jwks: ReturnType<typeof import('jose').createRemoteJWKSet> | null = null;

  readonly supportsRefresh = false;
  readonly supportsMfaClaims = true;

  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string): Promise<VerifyTokenResult> {
    await this.ensureInitialized();

    try {
      const jose = await import('jose');
      const { payload } = await jose.jwtVerify(token, this.jwks!, {
        issuer: `https://${this.configService.zitadelDomain}`,
        audience: this.configService.zitadelProjectId,
      });

      const payloadRecord = payload as Record<string, unknown>;
      const user = this.normalizeUser(payloadRecord);
      return {
        user,
        expiresAt: (payload.exp as number) ?? 0,
        rawPayload: payloadRecord,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired Zitadel token');
    }
  }

  refreshToken(): Promise<RefreshTokenResult> {
    return Promise.reject(
      new NotImplementedException('Zitadel token refresh is handled client-side'),
    );
  }

  async getUserInfo(userId: string, accessToken: string): Promise<UserInfo> {
    const domain = this.configService.zitadelDomain;
    const res = await fetch(`https://${domain}/oidc/v1/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException('Failed to fetch user info from Zitadel');
    }
    const data = (await res.json()) as Record<string, unknown>;
    return {
      id: (data.sub as string) ?? userId,
      email: (data.email as string) ?? null,
      emailVerified: (data.email_verified as boolean) ?? false,
      name: (data.name as string) ?? null,
      picture: (data.picture as string) ?? null,
      roles: this.extractRoles(data),
      permissions: [],
      orgId: (data['urn:zitadel:iam:org:id'] as string) ?? null,
      mfaEnabled: false,
      metadata: data,
    };
  }

  private normalizeUser(payload: Record<string, unknown>): AuthUser {
    const amr = payload.amr as string[] | undefined;
    return {
      id: payload.sub as string,
      email: (payload.email as string) ?? null,
      roles: this.extractRoles(payload),
      permissions: [],
      orgId: (payload['urn:zitadel:iam:org:id'] as string) ?? null,
      mfaVerified: amr ? amr.includes('mfa') || amr.includes('otp') || amr.includes('u2f') : false,
      metadata: { provider: 'zitadel' },
    };
  }

  private extractRoles(payload: Record<string, unknown>): string[] {
    const rolesObj = payload['urn:zitadel:iam:org:project:roles'] as
      | Record<string, unknown>
      | undefined;
    return rolesObj ? Object.keys(rolesObj) : [];
  }

  private async ensureInitialized(): Promise<void> {
    if (this.jwks) return;

    try {
      const jose = await import('jose');
      const jwksUrl = `https://${this.configService.zitadelDomain}/oauth/v2/keys`;
      this.jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
      this.logger.log('Zitadel provider initialized');
    } catch {
      throw new Error('Zitadel provider requires "jose" package. Run: pnpm add jose');
    }
  }
}
