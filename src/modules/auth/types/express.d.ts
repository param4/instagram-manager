import { AuthUser } from './auth.type';
import { PermissionScope } from '@modules/authorization/types/authorization.type';
import { User } from '@modules/users/entities/user.entity';
import { BusinessContextStore } from '@modules/business-context/types/business-context.type';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Resolved data scope from PermissionGuard */
      dataScope?: PermissionScope;
      /** Local user record (populated by SuperAdminGuard or PermissionGuard) */
      localUser?: User;
      /** Business context set by BusinessContextGuard */
      businessContext?: BusinessContextStore;
    }
  }
}
