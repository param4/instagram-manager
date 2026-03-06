import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Permission } from '../entities/permission.entity';
import { PermissionScope, SCOPE_PRECEDENCE } from '../types/authorization.type';

export type UserPermissionEntry = {
  resource: string;
  action: string;
  scope: PermissionScope;
};

/**
 * Caches a user's resolved permissions for the duration of a request.
 *
 * On the first call per userId, loads all roles → permissions from DB.
 * Subsequent calls within the same request return the cached result.
 */
@Injectable()
export class PermissionCacheService {
  /** Per-request cache. Cleared naturally when the service goes out of scope. */
  private cache = new Map<string, UserPermissionEntry[]>();

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
  ) {}

  async getPermissions(userId: string, businessId: string): Promise<UserPermissionEntry[]> {
    const key = `${userId}:${businessId}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Load user's role IDs
    const userRoles = await this.userRoleRepo.find({
      where: { userId, businessId },
    });
    const roleIds = userRoles.map((ur) => ur.roleId);

    if (roleIds.length === 0) {
      this.cache.set(key, []);
      return [];
    }

    // Load permissions for those roles
    const rolePerms = await this.rolePermRepo
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .getMany();

    const permissions = rolePerms.map((rp) => ({
      resource: rp.permission.resource,
      action: rp.permission.action,
      scope: rp.permission.scope,
    }));

    this.cache.set(key, permissions);
    return permissions;
  }

  /**
   * Resolves the widest scope for a given resource + action.
   * Returns null if the user has no matching permission.
   */
  resolveScope(
    permissions: UserPermissionEntry[],
    resource: string,
    action: string,
  ): PermissionScope | null {
    const matching = permissions.filter((p) => p.resource === resource && p.action === action);

    if (matching.length === 0) return null;

    // Return the scope with the highest precedence
    return matching.reduce((widest, curr) => {
      return SCOPE_PRECEDENCE[curr.scope] > SCOPE_PRECEDENCE[widest] ? curr.scope : widest;
    }, matching[0].scope);
  }
}
