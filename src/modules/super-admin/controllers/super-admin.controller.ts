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
import { SuperAdminOnly } from '../decorators/super-admin-only.decorator';
import { BusinessService } from '@modules/business/services/business.service';
import { CreateBusinessModel } from '@modules/business/models/create-business.model';
import { UpdateBusinessModel } from '@modules/business/models/update-business.model';
import { BusinessQueryModel } from '@modules/business/models/business-query.model';
import { ApiResponse as AppApiResponse } from '@common/types/response.type';
import { BusinessResponseModel } from '@modules/business/models/business-response.model';

/**
 * Platform-level business management endpoints.
 *
 * All routes require super admin access.
 */
@ApiTags('super-admin')
@ApiBearerAuth()
@SuperAdminOnly()
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly businessService: BusinessService) {}

  @Post('businesses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new business with admin user' })
  @ApiResponse({ status: 201, description: 'Business created' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  async createBusiness(
    @Body() dto: CreateBusinessModel,
  ): Promise<AppApiResponse<BusinessResponseModel & { adminUserId: string }>> {
    const result = await this.businessService.create(dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `Business "${result.name}" created successfully`,
      data: result,
    };
  }

  @Get('businesses')
  @ApiOperation({ summary: 'List all businesses (paginated)' })
  @ApiResponse({ status: 200, description: 'Businesses retrieved' })
  async listBusinesses(
    @Query() query: BusinessQueryModel,
  ): Promise<AppApiResponse<{ data: BusinessResponseModel[]; total: number }>> {
    const result = await this.businessService.findAll(query);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Businesses retrieved successfully',
      data: result,
    };
  }

  @Get('businesses/:id')
  @ApiOperation({ summary: 'Get business details' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Business details' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getBusiness(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse<BusinessResponseModel>> {
    const result = await this.businessService.findOne(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Business retrieved successfully',
      data: result,
    };
  }

  @Patch('businesses/:id')
  @ApiOperation({ summary: 'Update a business' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Business updated' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async updateBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessModel,
  ): Promise<AppApiResponse<BusinessResponseModel>> {
    const result = await this.businessService.update(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Business updated successfully',
      data: result,
    };
  }

  @Delete('businesses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a business' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Business deleted' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async deleteBusiness(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse<BusinessResponseModel>> {
    const result = await this.businessService.softDelete(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Business soft-deleted successfully',
      data: result,
    };
  }

  @Post('businesses/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted business' })
  @ApiParam({ name: 'id', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'Business restored' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async restoreBusiness(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse<BusinessResponseModel>> {
    const result = await this.businessService.restore(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Business restored successfully',
      data: result,
    };
  }
}
