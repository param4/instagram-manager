import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { TeamsService } from '../services/teams.service';
import { CreateTeamModel } from '../models/create-team.model';
import { UpdateTeamModel } from '../models/update-team.model';
import { AddMemberModel } from '../models/add-member.model';
import { TeamResponseModel } from '../models/team-response.model';
import { ApiResponse as AppApiResponse } from '@common/types/response.type';

@ApiTags('business-teams')
@ApiBearerAuth()
@Roles('admin')
@Controller('business/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a team' })
  async createTeam(@Body() dto: CreateTeamModel): Promise<AppApiResponse<TeamResponseModel>> {
    const team = await this.teamsService.create(dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `Team "${team.name}" created`,
      data: team,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List teams in the business' })
  async listTeams(): Promise<AppApiResponse<TeamResponseModel[]>> {
    const teams = await this.teamsService.findAll();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Teams retrieved successfully',
      data: teams,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  async updateTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamModel,
  ): Promise<AppApiResponse<TeamResponseModel>> {
    const team = await this.teamsService.update(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Team updated successfully',
      data: team,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a team' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  async deleteTeam(@Param('id', ParseUUIDPipe) id: string): Promise<AppApiResponse<null>> {
    await this.teamsService.softDelete(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Team deleted successfully',
      data: null,
    };
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a member to the team' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberModel,
  ): Promise<AppApiResponse<null>> {
    await this.teamsService.addMember(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Member added to team',
      data: null,
    };
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the team' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  @ApiParam({ name: 'userId', description: 'User UUID to remove' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AppApiResponse<null>> {
    await this.teamsService.removeMember(id, userId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Member removed from team',
      data: null,
    };
  }
}
