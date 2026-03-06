import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { UsersService } from '../services/users.service';
import { CreateUserModel } from '../models/create-user.model';
import { UpdateUserModel } from '../models/update-user.model';
import { UserQueryModel } from '../models/user-query.model';
import { UserResponseModel } from '../models/user-response.model';
import { ApiResponse as AppApiResponse } from '@common/types/response.type';

/**
 * Business admin user management endpoints.
 *
 * All routes are scoped to the current business via BusinessContextGuard.
 */
@ApiTags('business-users')
@ApiBearerAuth()
@Roles('admin')
@Controller('business/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a user in the business' })
  @ApiResponse({ status: 201, description: 'User created' })
  async createUser(@Body() dto: CreateUserModel): Promise<AppApiResponse<UserResponseModel>> {
    const result = await this.usersService.create(dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `User "${result.name}" created successfully`,
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List users in the business' })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async listUsers(
    @Query() query: UserQueryModel,
  ): Promise<AppApiResponse<{ data: UserResponseModel[]; total: number }>> {
    const result = await this.usersService.findAll(query);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details' })
  async getUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse<UserResponseModel>> {
    const result = await this.usersService.findOne(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserModel,
  ): Promise<AppApiResponse<UserResponseModel>> {
    const result = await this.usersService.update(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string): Promise<AppApiResponse<null>> {
    await this.usersService.softDelete(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User deactivated successfully',
      data: null,
    };
  }
}
