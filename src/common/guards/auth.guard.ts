import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_MFA_KEY } from '../decorators/require-mfa.decorator';
import {
  AuthProviderInterface,
  AUTH_PROVIDER_TOKEN,
} from '@modules/auth/providers/auth-provider.interface';
import { ConfigService } from '@config/config.service';

/**
 * Global authentication guard.
 *
 * Applied to ALL routes via APP_GUARD. Checks for a Bearer token in the
 * Authorization header, verifies it using the configured auth provider,
 * and attaches the normalized AuthUser to the request.
 *
 * After provider verification, enriches the AuthUser with local DB data
 * (businessId as orgId, role names, super-admin flag) so downstream guards
 * (RolesGuard, BusinessContextGuard, PermissionGuard) work correctly.
 *
 * Routes decorated with @Public() bypass authentication entirely.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_PROVIDER_TOKEN)
    private readonly authProvider: AuthProviderInterface,
    private readonly configService: ConfigService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    try {
      const result = await this.authProvider.verifyToken(token);

      // Enrich with local DB data (businessId, roles, super-admin flag)
      try {
        await this.enrichFromLocalDb(result.user);
      } catch (enrichError) {
        this.logger.warn(
          `Failed to enrich user from local DB: ${enrichError instanceof Error ? enrichError.message : String(enrichError)}`,
        );
      }

      request.user = result.user;

      // MFA enforcement: global config or per-route decorator
      const requireMfa =
        this.configService.authRequireMfa ||
        this.reflector.getAllAndOverride<boolean>(REQUIRE_MFA_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);

      if (requireMfa && this.authProvider.supportsMfaClaims && !result.user.mfaVerified) {
        throw new ForbiddenException('Multi-factor authentication is required');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.warn(
        `Token verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async enrichFromLocalDb(user: {
    id: string;
    orgId: string | null;
    roles: string[];
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const rows: Array<{
      business_id: string | null;
      is_super_admin: boolean;
      role_name: string | null;
    }> = await this.dataSource.query(
      `SELECT u.business_id, u.is_super_admin, r.name AS role_name
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.auth_provider_id = $1 AND u."deletedAt" IS NULL
       LIMIT 20`,
      [user.id],
    );

    if (rows.length === 0) return;

    user.orgId = rows[0].business_id;
    user.metadata = { ...user.metadata, isSuperAdmin: rows[0].is_super_admin };
    user.roles = rows.map((r) => r.role_name).filter((name): name is string => name !== null);
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
