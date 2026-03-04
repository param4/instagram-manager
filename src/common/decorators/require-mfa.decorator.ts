import { SetMetadata } from '@nestjs/common';

export const REQUIRE_MFA_KEY = 'requireMfa';

/**
 * Requires MFA verification for a specific route, even if
 * AUTH_REQUIRE_MFA is not globally enabled.
 *
 * @example
 * @RequireMfa()
 * @Delete('account')
 * deleteAccount() { ... }
 */
export const RequireMfa = () => SetMetadata(REQUIRE_MFA_KEY, true);
