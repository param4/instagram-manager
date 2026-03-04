import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Specifies which roles are allowed to access a route.
 * The guard checks the normalized AuthUser.roles array.
 * Access is granted if the user has ANY of the specified roles.
 *
 * @example
 * @Roles('admin', 'editor')
 * @Post('publish')
 * publishContent() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
