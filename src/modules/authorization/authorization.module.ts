import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionAuditLog } from './entities/permission-audit-log.entity';
import { User } from '@modules/users/entities/user.entity';
import { UserHierarchy } from '@modules/users/entities/user-hierarchy.entity';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { PermissionAuditService } from './services/permission-audit.service';
import { HierarchyService } from './services/hierarchy.service';
import { PermissionGuard } from './guards/permission.guard';
import { RoleController } from './controllers/role.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      UserRole,
      PermissionAuditLog,
      User,
      UserHierarchy,
    ]),
  ],
  controllers: [RoleController],
  providers: [
    RoleService,
    PermissionService,
    PermissionCacheService,
    PermissionAuditService,
    HierarchyService,
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [RoleService, PermissionService, PermissionCacheService, HierarchyService],
})
export class AuthorizationModule {}
