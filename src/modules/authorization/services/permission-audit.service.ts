import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionAuditLog } from '../entities/permission-audit-log.entity';
import { AuditAction } from '../types/authorization.type';

@Injectable()
export class PermissionAuditService {
  constructor(
    @InjectRepository(PermissionAuditLog)
    private readonly auditRepo: Repository<PermissionAuditLog>,
  ) {}

  async log(params: {
    businessId: string;
    changedBy: string;
    roleId: string;
    permissionId?: string;
    action: AuditAction;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  }): Promise<void> {
    const entry = this.auditRepo.create({
      businessId: params.businessId,
      changedBy: params.changedBy,
      roleId: params.roleId,
      permissionId: params.permissionId ?? null,
      action: params.action,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
    });
    await this.auditRepo.save(entry);
  }
}
