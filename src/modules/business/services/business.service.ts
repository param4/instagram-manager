import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Business } from '../entities/business.entity';
import { BusinessSeedService } from './business-seed.service';
import { CreateBusinessModel } from '../models/create-business.model';
import { UpdateBusinessModel } from '../models/update-business.model';
import { BusinessQueryModel } from '../models/business-query.model';
import { BusinessResponseModel } from '../models/business-response.model';
import { User } from '@modules/users/entities/user.entity';
import { UserHierarchy } from '@modules/users/entities/user-hierarchy.entity';
import { UserRole } from '@modules/authorization/entities/user-role.entity';
import { Role } from '@modules/authorization/entities/role.entity';
import { UserStatus } from '@modules/users/types/user.type';
import { AuthService } from '@modules/auth/services/auth.service';

/**
 * Handles business CRUD operations for super admins.
 *
 * Business creation is transactional: creates the business record,
 * seeds default roles/permissions, creates the first admin user,
 * and links everything — rolling back on any failure.
 */
@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);

  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly dataSource: DataSource,
    private readonly seedService: BusinessSeedService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Creates a new business with its first admin user in a single transaction.
   */
  async create(dto: CreateBusinessModel): Promise<BusinessResponseModel & { adminUserId: string }> {
    // Check slug uniqueness
    const existing = await this.businessRepo.findOneBy({ slug: dto.slug });
    if (existing) {
      throw new ConflictException(`Business with slug "${dto.slug}" already exists`);
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Create business
      const businessRepo = manager.getRepository(Business);
      const business = businessRepo.create({
        name: dto.name,
        slug: dto.slug,
        maxUsers: dto.maxUsers ?? null,
        subscriptionPlan: dto.subscriptionPlan ?? null,
      });
      const savedBusiness = await businessRepo.save(business);

      // 2. Seed default roles & permissions
      await this.seedService.seedDefaults(savedBusiness.id, manager);

      // 3. Create admin user in auth provider
      let authProviderId: string;
      try {
        const result = await this.authService.createUser({
          email: dto.adminEmail,
          name: dto.adminName,
          password: dto.adminPassword,
          username: dto.adminUsername,
        });
        authProviderId = result.authProviderId;
      } catch (error) {
        const messages: string[] = [];
        if (error && typeof error === 'object' && 'errors' in error) {
          for (const e of error.errors) {
            messages.push(e.longMessage || e.message || e.code);
          }
        } else {
          messages.push(error instanceof Error ? error.message : String(error));
        }
        throw new ConflictException(
          `Auth provider rejected admin user creation: ${messages.join('; ')}`,
        );
      }

      // 4. Create local user record
      const userRepo = manager.getRepository(User);
      const adminUser = userRepo.create({
        businessId: savedBusiness.id,
        authProviderId,
        email: dto.adminEmail,
        name: dto.adminName,
        status: UserStatus.ACTIVE,
      });
      const savedUser = await userRepo.save(adminUser);

      // 5. Assign 'Admin' system role
      const roleRepo = manager.getRepository(Role);
      const adminRole = await roleRepo.findOneBy({
        businessId: savedBusiness.id,
        name: 'Admin',
        isSystem: true,
      });

      if (adminRole) {
        const userRoleRepo = manager.getRepository(UserRole);
        await userRoleRepo.save(
          userRoleRepo.create({
            userId: savedUser.id,
            roleId: adminRole.id,
            businessId: savedBusiness.id,
          }),
        );
      }

      // 6. Create hierarchy entry (top of chain)
      const hierarchyRepo = manager.getRepository(UserHierarchy);
      await hierarchyRepo.save(
        hierarchyRepo.create({
          userId: savedUser.id,
          managerId: null,
          businessId: savedBusiness.id,
        }),
      );

      this.logger.log(`Business "${savedBusiness.name}" created with admin ${savedUser.email}`);

      return {
        ...this.toResponse(savedBusiness),
        adminUserId: savedUser.id,
      };
    });
  }

  async findAll(
    query: BusinessQueryModel,
  ): Promise<{ data: BusinessResponseModel[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.businessRepo.createQueryBuilder('business');

    if (query.status) {
      qb.andWhere('business.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere('(business.name ILIKE :search OR business.slug ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('business.createdAt', 'DESC').skip(skip).take(limit);

    const [businesses, total] = await qb.getManyAndCount();

    return {
      data: businesses.map((b) => this.toResponse(b)),
      total,
    };
  }

  async findOne(id: string): Promise<BusinessResponseModel> {
    const business = await this.businessRepo.findOneBy({ id });
    if (!business) {
      throw new NotFoundException(`Business ${id} not found`);
    }
    return this.toResponse(business);
  }

  async update(id: string, dto: UpdateBusinessModel): Promise<BusinessResponseModel> {
    const business = await this.businessRepo.findOneBy({ id });
    if (!business) {
      throw new NotFoundException(`Business ${id} not found`);
    }

    Object.assign(business, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.maxUsers !== undefined && { maxUsers: dto.maxUsers }),
      ...(dto.subscriptionPlan !== undefined && { subscriptionPlan: dto.subscriptionPlan }),
      ...(dto.settings !== undefined && { settings: dto.settings }),
    });

    const saved = await this.businessRepo.save(business);
    this.logger.log(`Business ${id} updated`);
    return this.toResponse(saved);
  }

  async softDelete(id: string): Promise<BusinessResponseModel> {
    const business = await this.businessRepo.findOneBy({ id });
    if (!business) {
      throw new NotFoundException(`Business ${id} not found`);
    }

    await this.businessRepo.softDelete(id);
    this.logger.log(`Business ${id} soft-deleted`);
    return this.toResponse(business);
  }

  async restore(id: string): Promise<BusinessResponseModel> {
    const business = await this.businessRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!business) {
      throw new NotFoundException(`Business ${id} not found`);
    }

    await this.businessRepo.restore(id);
    business.deletedAt = null;
    this.logger.log(`Business ${id} restored`);
    return this.toResponse(business);
  }

  private toResponse(business: Business): BusinessResponseModel {
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      status: business.status,
      settings: business.settings,
      subscriptionPlan: business.subscriptionPlan,
      maxUsers: business.maxUsers,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }
}
