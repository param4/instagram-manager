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

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
