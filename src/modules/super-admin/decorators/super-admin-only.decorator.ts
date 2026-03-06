import { SetMetadata } from '@nestjs/common';

export const IS_SUPER_ADMIN_ONLY_KEY = 'isSuperAdminOnly';

/**
 * Marks a route or controller as accessible only to platform super admins.
 *
 * When applied, the {@link SuperAdminGuard} verifies the caller has
 * `is_super_admin: true` in the local users table.  The
 * {@link BusinessContextGuard} also reads this metadata to set
 * `isSuperAdmin: true` in the async store, bypassing business scoping.
 */
export const SuperAdminOnly = () => SetMetadata(IS_SUPER_ADMIN_ONLY_KEY, true);
