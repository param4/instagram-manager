import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { PermissionAction } from '../types/authorization.type';
import { BusinessContextService } from '@modules/business-context/services/business-context.service';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    private readonly businessContext: BusinessContextService,
  ) {}

  async findAll(): Promise<Permission[]> {
    const businessId = this.businessContext.getBusinessId();
    return this.permRepo.find({ where: { businessId } });
  }

  async findByResourceAndAction(resource: string, action: string): Promise<Permission[]> {
    const businessId = this.businessContext.getBusinessId();
    return this.permRepo.find({
      where: { businessId, resource, action: action as PermissionAction },
    });
  }
}
