import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Role } from '@modules/authorization/entities/role.entity';
import { Permission } from '@modules/authorization/entities/permission.entity';
import { RolePermission } from '@modules/authorization/entities/role-permission.entity';
import {
  PermissionAction,
  PermissionScope,
  DEFAULT_RESOURCES,
} from '@modules/authorization/types/authorization.type';

/**
 * Permission matrix entry: [action, scope].
 * `null` means the role does NOT get this action for the resource.
 */
type ScopeEntry = [PermissionAction, PermissionScope] | null;

type RoleSeed = {
  name: string;
  description: string;
  /** One entry per CRUD action: [create, read, update, delete] */
  matrix: [ScopeEntry, ScopeEntry, ScopeEntry, ScopeEntry];
};

const ROLE_SEEDS: RoleSeed[] = [
  {
    name: 'Admin',
    description: 'Full access to all resources in the business',
    matrix: [
      [PermissionAction.CREATE, PermissionScope.ALL],
      [PermissionAction.READ, PermissionScope.ALL],
      [PermissionAction.UPDATE, PermissionScope.ALL],
      [PermissionAction.DELETE, PermissionScope.ALL],
    ],
  },
  {
    name: 'Manager',
    description: 'Can read/update across team and subordinates',
    matrix: [
      [PermissionAction.CREATE, PermissionScope.TEAM],
      [PermissionAction.READ, PermissionScope.HIERARCHY],
      [PermissionAction.UPDATE, PermissionScope.HIERARCHY],
      [PermissionAction.DELETE, PermissionScope.OWN],
    ],
  },
  {
    name: 'Team Lead',
    description: 'Can read/update within their team',
    matrix: [
      [PermissionAction.CREATE, PermissionScope.TEAM],
      [PermissionAction.READ, PermissionScope.TEAM],
      [PermissionAction.UPDATE, PermissionScope.TEAM],
      [PermissionAction.DELETE, PermissionScope.OWN],
    ],
  },
  {
    name: 'Member',
    description: 'Can read/update assigned and own records',
    matrix: [
      [PermissionAction.CREATE, PermissionScope.OWN],
      [PermissionAction.READ, PermissionScope.ASSIGNED],
      [PermissionAction.UPDATE, PermissionScope.ASSIGNED],
      [PermissionAction.DELETE, PermissionScope.OWN],
    ],
  },
  {
    name: 'Viewer',
    description: 'Read-only access to own records',
    matrix: [null, [PermissionAction.READ, PermissionScope.OWN], null, null],
  },
];

/**
 * Seeds default roles, permissions, and their links for a new business.
 *
 * Called inside the business-creation transaction so everything is
 * rolled back if any step fails.
 */
@Injectable()
export class BusinessSeedService {
  private readonly logger = new Logger(BusinessSeedService.name);

  /**
   * Seeds default roles and permissions for a business.
   *
   * @param businessId - The newly created business ID
   * @param manager    - The transaction-scoped EntityManager
   */
  async seedDefaults(businessId: string, manager: EntityManager): Promise<void> {
    const roleRepo = manager.getRepository(Role);
    const permRepo = manager.getRepository(Permission);
    const rpRepo = manager.getRepository(RolePermission);

    // 1. Create all default permissions for every resource × action × scope combination
    const permissionMap = new Map<string, Permission>();

    for (const resource of DEFAULT_RESOURCES) {
      for (const roleSeed of ROLE_SEEDS) {
        for (const entry of roleSeed.matrix) {
          if (!entry) continue;
          const [action, scope] = entry;
          const key = `${resource}:${action}:${scope}`;

          if (!permissionMap.has(key)) {
            const permission = permRepo.create({
              businessId,
              resource,
              action,
              scope,
              description: `${action} ${resource} (${scope})`,
            });
            permissionMap.set(key, permission);
          }
        }
      }
    }

    const permissions = await permRepo.save([...permissionMap.values()]);

    // Re-index after save (IDs are now populated)
    const permIndex = new Map<string, Permission>();
    for (const p of permissions) {
      permIndex.set(`${p.resource}:${p.action}:${p.scope}`, p);
    }

    // 2. Create roles and link permissions
    for (const seed of ROLE_SEEDS) {
      const role = roleRepo.create({
        businessId,
        name: seed.name,
        description: seed.description,
        isSystem: true,
      });
      const savedRole = await roleRepo.save(role);

      const links: RolePermission[] = [];
      for (const resource of DEFAULT_RESOURCES) {
        for (const entry of seed.matrix) {
          if (!entry) continue;
          const [action, scope] = entry;
          const perm = permIndex.get(`${resource}:${action}:${scope}`);
          if (perm) {
            links.push(rpRepo.create({ roleId: savedRole.id, permissionId: perm.id }));
          }
        }
      }

      if (links.length > 0) {
        await rpRepo.save(links);
      }

      this.logger.debug(
        `Seeded role "${seed.name}" with ${links.length} permissions for business ${businessId}`,
      );
    }
  }
}
