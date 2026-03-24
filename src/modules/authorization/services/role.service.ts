import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { PermissionAuditService } from './permission-audit.service';
import { BusinessContextService } from '@modules/business-context/services/business-context.service';
import { AuditAction, PermissionAction, PermissionScope } from '../types/authorization.type';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly auditService: PermissionAuditService,
    private readonly businessContext: BusinessContextService,
  ) {}

  async findAll(): Promise<Role[]> {
    const businessId = this.businessContext.getBusinessId();
    return this.roleRepo.find({ where: { businessId }, order: { createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Role & { permissions: Permission[] }> {
    const businessId = this.businessContext.getBusinessId();
    const role = await this.roleRepo.findOneBy({ id, businessId });
    if (!role) throw new NotFoundException(`Role ${id} not found`);

    const rolePerms = await this.rolePermRepo.find({
      where: { roleId: id },
      relations: ['permission'],
    });

    return { ...role, permissions: rolePerms.map((rp) => rp.permission) };
  }

  async create(data: {
    name: string;
    description?: string;
    permissions?: { resource: string; action: string; scope: string }[];
  }): Promise<Role> {
    const businessId = this.businessContext.getBusinessId();

    const existing = await this.roleRepo.findOneBy({ businessId, name: data.name });
    if (existing) {
      throw new ConflictException(`Role "${data.name}" already exists in this business`);
    }

    const role = this.roleRepo.create({
      businessId,
      name: data.name,
      description: data.description ?? null,
      isSystem: false,
    });
    const saved = await this.roleRepo.save(role);

    // Link permissions if provided
    if (data.permissions?.length) {
      for (const p of data.permissions) {
        const perm = await this.permRepo.findOneBy({
          businessId,
          resource: p.resource,
          action: p.action as PermissionAction,
          scope: p.scope as PermissionScope,
        });
        if (perm) {
          await this.rolePermRepo.save(
            this.rolePermRepo.create({ roleId: saved.id, permissionId: perm.id }),
          );
        }
      }
    }

    return saved;
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Role> {
    const businessId = this.businessContext.getBusinessId();
    const role = await this.roleRepo.findOneBy({ id, businessId });
    if (!role) throw new NotFoundException(`Role ${id} not found`);

    if (data.name !== undefined) role.name = data.name;
    if (data.description !== undefined) role.description = data.description;

    return this.roleRepo.save(role);
  }

  async delete(id: string): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const role = await this.roleRepo.findOneBy({ id, businessId });
    if (!role) throw new NotFoundException(`Role ${id} not found`);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if users are still assigned
    const assignedCount = await this.userRoleRepo.count({ where: { roleId: id } });
    if (assignedCount > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${assignedCount} user(s) still assigned. Reassign them first.`,
      );
    }

    await this.rolePermRepo.delete({ roleId: id });
    await this.roleRepo.delete(id);
  }

  async addPermission(
    roleId: string,
    data: { resource: string; action: string; scope: string },
  ): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const role = await this.roleRepo.findOneBy({ id: roleId, businessId });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);

    // Find or create the permission
    let perm = await this.permRepo.findOneBy({
      businessId,
      resource: data.resource,
      action: data.action as PermissionAction,
      scope: data.scope as PermissionScope,
    });

    if (!perm) {
      perm = await this.permRepo.save(
        this.permRepo.create({
          businessId,
          resource: data.resource,
          action: data.action as PermissionAction,
          scope: data.scope as PermissionScope,
        }),
      );
    }

    // Check if already linked
    const existing = await this.rolePermRepo.findOneBy({
      roleId,
      permissionId: perm.id,
    });
    if (existing) return;

    await this.rolePermRepo.save(this.rolePermRepo.create({ roleId, permissionId: perm.id }));

    // Audit log
    const userId = this.businessContext.getCurrentUserId();
    await this.auditService.log({
      businessId,
      changedBy: userId,
      roleId,
      permissionId: perm.id,
      action: AuditAction.ADDED,
      newValue: { resource: data.resource, action: data.action, scope: data.scope },
    });
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const role = await this.roleRepo.findOneBy({ id: roleId, businessId });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);

    const perm = await this.permRepo.findOneBy({ id: permissionId, businessId });
    if (!perm) throw new NotFoundException(`Permission ${permissionId} not found`);

    await this.rolePermRepo.delete({ roleId, permissionId });

    // Audit log
    const userId = this.businessContext.getCurrentUserId();
    await this.auditService.log({
      businessId,
      changedBy: userId,
      roleId,
      permissionId,
      action: AuditAction.REMOVED,
      oldValue: { resource: perm.resource, action: perm.action, scope: perm.scope },
    });
  }

  async getRoleUsers(roleId: string): Promise<string[]> {
    const businessId = this.businessContext.getBusinessId();
    const userRoles = await this.userRoleRepo.find({
      where: { roleId, businessId },
    });
    return userRoles.map((ur) => ur.userId);
  }
}
