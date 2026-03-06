import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '../types/authorization.type';

export const PERMISSION_KEY = 'requiredPermission';

export type RequiredPermission = {
  resource: string;
  action: PermissionAction;
};

/**
 * Marks a route as requiring a specific resource + action permission.
 *
 * The {@link PermissionGuard} resolves the widest scope the user has
 * for this resource+action and attaches it to `request.dataScope`.
 *
 * @example
 * ```ts
 * @RequirePermission('instagram-post', PermissionAction.READ)
 * @Get('posts')
 * listPosts() { ... }
 * ```
 */
export const RequirePermission = (resource: string, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { resource, action } satisfies RequiredPermission);
