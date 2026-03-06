export { AuthorizationModule } from './authorization.module';
export { Role } from './entities/role.entity';
export { Permission } from './entities/permission.entity';
export { RolePermission } from './entities/role-permission.entity';
export { UserRole } from './entities/user-role.entity';
export { PermissionAuditLog } from './entities/permission-audit-log.entity';
export { RequirePermission } from './decorators/require-permission.decorator';
export { PermissionGuard } from './guards/permission.guard';
export { RoleService } from './services/role.service';
export { PermissionService } from './services/permission.service';
export { PermissionCacheService } from './services/permission-cache.service';
export { HierarchyService } from './services/hierarchy.service';
export {
  PermissionAction,
  PermissionScope,
  SCOPE_PRECEDENCE,
  AuditAction,
  TeamRole,
} from './types/authorization.type';
