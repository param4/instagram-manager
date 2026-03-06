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
import { RoleService } from '../services/role.service';
import { CreateRoleModel } from '../models/create-role.model';
import { UpdateRoleModel } from '../models/update-role.model';
import { AddPermissionModel } from '../models/add-permission.model';
import { RoleResponseModel } from '../models/role-response.model';
import { ApiResponse as AppApiResponse } from '@common/types/response.type';

@ApiTags('business-roles')
@ApiBearerAuth()
@Roles('admin')
@Controller('business/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles in the business' })
  async listRoles(): Promise<AppApiResponse<RoleResponseModel[]>> {
    const roles = await this.roleService.findAll();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Roles retrieved successfully',
      data: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom role' })
  async createRole(@Body() dto: CreateRoleModel): Promise<AppApiResponse<RoleResponseModel>> {
    const role = await this.roleService.create(dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `Role "${role.name}" created`,
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role with permissions' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async getRole(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse<RoleResponseModel>> {
    const role = await this.roleService.findOne(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Role retrieved successfully',
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions.map((p) => ({
          id: p.id,
          resource: p.resource,
          action: p.action,
          scope: p.scope,
        })),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role name/description' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleModel,
  ): Promise<AppApiResponse<RoleResponseModel>> {
    const role = await this.roleService.update(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Role updated successfully',
      data: {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async deleteRole(@Param('id', ParseUUIDPipe) id: string): Promise<AppApiResponse<null>> {
    await this.roleService.delete(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Role deleted successfully',
      data: null,
    };
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add permission to role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async addPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPermissionModel,
  ): Promise<AppApiResponse<null>> {
    await this.roleService.addPermission(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Permission added to role',
      data: null,
    };
  }

  @Delete(':id/permissions/:permissionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiParam({ name: 'permissionId', description: 'Permission UUID' })
  async removePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ): Promise<AppApiResponse<null>> {
    await this.roleService.removePermission(id, permissionId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Permission removed from role',
      data: null,
    };
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'List users with this role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async getRoleUsers(@Param('id', ParseUUIDPipe) id: string): Promise<AppApiResponse<string[]>> {
    const userIds = await this.roleService.getRoleUsers(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Role users retrieved',
      data: userIds,
    };
  }
}
