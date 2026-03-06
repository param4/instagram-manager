export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum PermissionScope {
  OWN = 'own',
  ASSIGNED = 'assigned',
  TEAM = 'team',
  HIERARCHY = 'hierarchy',
  ALL = 'all',
}

/**
 * Scope precedence from narrowest to widest.
 * Used to resolve the widest scope when a user has multiple roles.
 */
export const SCOPE_PRECEDENCE: Record<PermissionScope, number> = {
  [PermissionScope.OWN]: 1,
  [PermissionScope.ASSIGNED]: 2,
  [PermissionScope.TEAM]: 3,
  [PermissionScope.HIERARCHY]: 4,
  [PermissionScope.ALL]: 5,
};

export enum TeamRole {
  MEMBER = 'member',
  LEAD = 'lead',
  MANAGER = 'manager',
}

export enum AuditAction {
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
}

/** Default system role names seeded on business creation. */
export const DEFAULT_ROLE_NAMES = ['Admin', 'Manager', 'Team Lead', 'Member', 'Viewer'] as const;

/** Resources seeded in the default permission matrix. */
export const DEFAULT_RESOURCES = [
  'instagram-account',
  'instagram-post',
  'user',
  'role',
  'team',
] as const;
