import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserHierarchy } from '../entities/user-hierarchy.entity';
import { UserRole } from '@modules/authorization/entities/user-role.entity';
import { Role } from '@modules/authorization/entities/role.entity';
import { CreateUserModel } from '../models/create-user.model';
import { UpdateUserModel } from '../models/update-user.model';
import { UserQueryModel } from '../models/user-query.model';
import { UserResponseModel } from '../models/user-response.model';
import { UserStatus } from '../types/user.type';
import { BusinessContextService } from '@modules/business-context/services/business-context.service';
import { AuthService } from '@modules/auth/services/auth.service';
import { Business } from '@modules/business/entities/business.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserHierarchy)
    private readonly hierarchyRepo: Repository<UserHierarchy>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly dataSource: DataSource,
    private readonly businessContext: BusinessContextService,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateUserModel): Promise<UserResponseModel> {
    const businessId = this.businessContext.getBusinessId();

    // Check max_users limit
    const business = await this.businessRepo.findOneBy({ id: businessId });
    if (business?.maxUsers) {
      const count = await this.userRepo.count({ where: { businessId } });
      if (count >= business.maxUsers) {
        throw new BadRequestException(
          `User limit of ${business.maxUsers} reached for this business`,
        );
      }
    }

    // Check duplicate email within business
    const existing = await this.userRepo.findOneBy({ email: dto.email, businessId });
    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists in this business`);
    }

    return this.dataSource.transaction(async (manager) => {
      // Create in auth provider
      let authProviderId: string;
      try {
        const result = await this.authService.createUser({
          email: dto.email,
          name: dto.name,
          password: dto.password,
          username: dto.username,
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
        throw new ConflictException(`Auth provider rejected user creation: ${messages.join('; ')}`);
      }

      // Create local user
      const userRepo = manager.getRepository(User);
      const user = userRepo.create({
        businessId,
        authProviderId,
        email: dto.email,
        name: dto.name,
        status: UserStatus.INVITED,
      });
      const savedUser = await userRepo.save(user);

      // Assign roles
      if (dto.roleIds.length > 0) {
        const userRoleRepo = manager.getRepository(UserRole);
        const roles = dto.roleIds.map((roleId) =>
          userRoleRepo.create({ userId: savedUser.id, roleId, businessId }),
        );
        await userRoleRepo.save(roles);
      }

      // Create hierarchy entry
      const hierarchyRepo = manager.getRepository(UserHierarchy);
      await hierarchyRepo.save(
        hierarchyRepo.create({
          userId: savedUser.id,
          managerId: dto.managerId ?? null,
          businessId,
        }),
      );

      this.logger.log(`User ${savedUser.email} created in business ${businessId}`);

      return this.toResponse(savedUser, dto.roleIds);
    });
  }

  async findAll(query: UserQueryModel): Promise<{ data: UserResponseModel[]; total: number }> {
    const businessId = this.businessContext.getBusinessId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.business_id = :businessId', { businessId });

    if (query.search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();
    return {
      data: users.map((u) => this.toResponse(u)),
      total,
    };
  }

  async findOne(id: string): Promise<UserResponseModel> {
    const businessId = this.businessContext.getBusinessId();
    const user = await this.userRepo.findOneBy({ id, businessId });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Load roles
    const userRoles = await this.userRoleRepo.find({
      where: { userId: id, businessId },
      relations: ['role'],
    });
    const roles = userRoles.map((ur) => ({ id: ur.roleId, name: ur.role?.name ?? '' }));

    // Load hierarchy
    const hierarchy = await this.hierarchyRepo.findOneBy({ userId: id });

    const response = this.toResponse(user);
    response.roles = roles;
    response.managerId = hierarchy?.managerId ?? null;
    return response;
  }

  async update(id: string, dto: UpdateUserModel): Promise<UserResponseModel> {
    const businessId = this.businessContext.getBusinessId();
    const user = await this.userRepo.findOneBy({ id, businessId });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.status !== undefined) user.status = dto.status;

    await this.userRepo.save(user);

    // Update roles if provided
    if (dto.roleIds !== undefined) {
      await this.userRoleRepo.delete({ userId: id, businessId });
      if (dto.roleIds.length > 0) {
        const roles = dto.roleIds.map((roleId) =>
          this.userRoleRepo.create({ userId: id, roleId, businessId }),
        );
        await this.userRoleRepo.save(roles);
      }
    }

    // Update hierarchy if manager changed
    if (dto.managerId !== undefined) {
      await this.hierarchyRepo.update({ userId: id }, { managerId: dto.managerId });
    }

    this.logger.log(`User ${id} updated`);
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const user = await this.userRepo.findOneBy({ id, businessId });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Cannot delete yourself
    const currentUserId = this.businessContext.getCurrentUserId();
    if (user.authProviderId === currentUserId) {
      throw new BadRequestException('Cannot delete yourself');
    }

    // Cannot delete the last admin
    const adminRole = await this.roleRepo.findOneBy({
      businessId,
      name: 'Admin',
      isSystem: true,
    });
    if (adminRole) {
      const adminUserRoles = await this.userRoleRepo.find({
        where: { roleId: adminRole.id, businessId },
      });
      const activeAdmins = await Promise.all(
        adminUserRoles.map(async (ur) => {
          const u = await this.userRepo.findOneBy({ id: ur.userId });
          return u && u.id !== id ? u : null;
        }),
      );
      if (activeAdmins.filter(Boolean).length === 0) {
        throw new BadRequestException('Cannot delete the last admin');
      }
    }

    await this.userRepo.softDelete(id);
    this.logger.log(`User ${id} soft-deleted`);
  }

  /** Look up local user by auth provider ID */
  async findByAuthProviderId(authProviderId: string): Promise<User | null> {
    return this.userRepo.findOneBy({ authProviderId });
  }

  private toResponse(user: User, roleIds?: string[]): UserResponseModel {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: roleIds?.map((id) => ({ id, name: '' })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
