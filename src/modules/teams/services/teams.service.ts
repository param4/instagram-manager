import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { UserTeam } from '../entities/user-team.entity';
import { CreateTeamModel } from '../models/create-team.model';
import { UpdateTeamModel } from '../models/update-team.model';
import { AddMemberModel } from '../models/add-member.model';
import { TeamResponseModel } from '../models/team-response.model';
import { BusinessContextService } from '@modules/business-context/services/business-context.service';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepo: Repository<UserTeam>,
    private readonly businessContext: BusinessContextService,
  ) {}

  async create(dto: CreateTeamModel): Promise<TeamResponseModel> {
    const businessId = this.businessContext.getBusinessId();
    const team = this.teamRepo.create({
      businessId,
      name: dto.name,
      parentTeamId: dto.parentTeamId ?? null,
    });
    const saved = await this.teamRepo.save(team);
    return this.toResponse(saved);
  }

  async findAll(): Promise<TeamResponseModel[]> {
    const businessId = this.businessContext.getBusinessId();
    const teams = await this.teamRepo.find({
      where: { businessId },
      order: { createdAt: 'ASC' },
    });
    return teams.map((t) => this.toResponse(t));
  }

  async update(id: string, dto: UpdateTeamModel): Promise<TeamResponseModel> {
    const businessId = this.businessContext.getBusinessId();
    const team = await this.teamRepo.findOneBy({ id, businessId });
    if (!team) throw new NotFoundException(`Team ${id} not found`);

    if (dto.name !== undefined) team.name = dto.name;
    if (dto.parentTeamId !== undefined) team.parentTeamId = dto.parentTeamId;

    const saved = await this.teamRepo.save(team);
    return this.toResponse(saved);
  }

  async softDelete(id: string): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const team = await this.teamRepo.findOneBy({ id, businessId });
    if (!team) throw new NotFoundException(`Team ${id} not found`);

    const memberCount = await this.userTeamRepo.count({ where: { teamId: id } });
    if (memberCount > 0) {
      throw new BadRequestException(
        `Cannot delete team: ${memberCount} member(s) still assigned. Reassign them first.`,
      );
    }

    await this.teamRepo.softDelete(id);
  }

  async addMember(teamId: string, dto: AddMemberModel): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const team = await this.teamRepo.findOneBy({ id: teamId, businessId });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);

    const existing = await this.userTeamRepo.findOneBy({
      userId: dto.userId,
      teamId,
    });
    if (existing) return;

    await this.userTeamRepo.save(
      this.userTeamRepo.create({
        userId: dto.userId,
        teamId,
        roleInTeam: dto.roleInTeam ?? null,
      }),
    );
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const team = await this.teamRepo.findOneBy({ id: teamId, businessId });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);

    await this.userTeamRepo.delete({ userId, teamId });
  }

  /** Returns all team IDs the user belongs to. */
  async getUserTeamIds(userId: string): Promise<string[]> {
    const userTeams = await this.userTeamRepo.find({
      where: { userId },
    });
    return userTeams.map((ut) => ut.teamId);
  }

  private toResponse(team: Team): TeamResponseModel {
    return {
      id: team.id,
      name: team.name,
      parentTeamId: team.parentTeamId,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }
}
