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
import { IS_SUPER_ADMIN_ONLY_KEY } from '../decorators/super-admin-only.decorator';
import { User } from '@modules/users/entities/user.entity';

/**
 * Guard that restricts access to platform super admins only.
 *
 * Looks up the local User record by `auth_provider_id` (from the JWT)
 * and verifies `is_super_admin: true`.
 *
 * Applied per-route via `@SuperAdminOnly()` decorator, NOT globally.
 * Use `@UseGuards(SuperAdminGuard)` or register as APP_GUARD and
 * check metadata.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSuperAdminOnly = this.reflector.getAllAndOverride<boolean>(IS_SUPER_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isSuperAdminOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authUser = request.user;

    if (!authUser) {
      throw new ForbiddenException('Authentication required');
    }

    // Look up local user by auth provider ID
    const localUser = await this.userRepo.findOneBy({
      authProviderId: authUser.id,
    });

    if (!localUser || !localUser.isSuperAdmin) {
      this.logger.warn(`Super admin access denied for auth user ${authUser.id}`);
      throw new ForbiddenException('Super admin access required');
    }

    // Attach local user to request for downstream use
    request.localUser = localUser;
    return true;
  }
}
