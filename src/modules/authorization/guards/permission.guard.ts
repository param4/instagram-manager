import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { PERMISSION_KEY, RequiredPermission } from '../decorators/require-permission.decorator';
import { PermissionCacheService } from '../services/permission-cache.service';
import { User } from '@modules/users/entities/user.entity';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';

/**
 * Global guard that checks if the user has the required permission.
 *
 * Reads `@RequirePermission(resource, action)` metadata. If present,
 * resolves the user's widest scope for that resource+action and
 * attaches it to `request.dataScope`.
 *
 * If the user has no matching permission, throws 403.
 * Routes without `@RequirePermission` pass through.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionCache: PermissionCacheService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @RequirePermission decorator — pass through
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authUser = request.user;

    if (!authUser) {
      throw new ForbiddenException('Authentication required');
    }

    // Look up local user to get internal UUID
    const localUser =
      request.localUser ??
      (await this.userRepo.findOneBy({
        authProviderId: authUser.id,
      }));

    if (!localUser) {
      this.logger.warn(`Permission denied: no local user for auth ID ${authUser.id}`);
      throw new ForbiddenException('User not found in this business');
    }

    // Super admins bypass permission checks
    if (localUser.isSuperAdmin) {
      return true;
    }

    if (!localUser.businessId) {
      throw new ForbiddenException('User has no business context');
    }

    request.localUser = localUser;

    // Resolve permissions
    const permissions = await this.permissionCache.getPermissions(
      localUser.id,
      localUser.businessId,
    );

    const scope = this.permissionCache.resolveScope(
      permissions,
      required.resource,
      required.action,
    );

    if (!scope) {
      this.logger.warn(
        `Permission denied: user ${localUser.id} lacks ${required.action} on ${required.resource}`,
      );
      throw new ForbiddenException(
        `Missing permission: ${required.action} on ${required.resource}`,
      );
    }

    // Attach resolved scope to request for downstream use
    request.dataScope = scope;
    return true;
  }
}
