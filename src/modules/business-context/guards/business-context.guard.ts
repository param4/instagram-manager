import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { IS_SUPER_ADMIN_ONLY_KEY } from '@modules/super-admin/decorators/super-admin-only.decorator';
import { BusinessContextService } from '../services/business-context.service';

/**
 * Global guard that populates the AsyncLocalStorage-backed business context.
 *
 * Must be registered AFTER AuthGuard (via module import order in app.module)
 * so that `request.user` is already populated from the JWT.
 *
 * - Public routes are skipped (no context needed).
 * - Super-admin routes set `isSuperAdmin: true` and allow null businessId.
 * - All other routes extract `businessId` from `request.user.orgId`.
 */
@Injectable()
export class BusinessContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly businessContextService: BusinessContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      // AuthGuard should have rejected already; nothing to do.
      return true;
    }

    const isSuperAdminRoute = this.reflector.getAllAndOverride<boolean>(IS_SUPER_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.businessContextService.populate({
      businessId: user.orgId ?? null,
      userId: user.id,
      isSuperAdmin: !!isSuperAdminRoute,
    });

    return true;
  }
}
