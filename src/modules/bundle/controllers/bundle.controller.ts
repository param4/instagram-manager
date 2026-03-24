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
import { ApiResponse as AppApiResponse } from '@common/types/response.type';
import { BundleService } from '../services/bundle.service';
import { CreateBundleModel } from '../models/create-bundle.model';
import { UpdateBundleModel } from '../models/update-bundle.model';
import { BundleQueryModel } from '../models/bundle-query.model';
import { BundleResponseModel } from '../models/bundle-response.model';
import { CreateReelModel } from '../models/create-reel.model';
import { UpdateReelModel } from '../models/update-reel.model';
import { ReelResponseModel } from '../models/reel-response.model';

@ApiTags('bundles')
@ApiBearerAuth()
@Roles('admin')
@Controller('bundles')
export class BundleController {
  constructor(private readonly bundleService: BundleService) {}

  // ── Bundle endpoints ───────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a bundle' })
  @ApiResponse({ status: 201, description: 'Bundle created' })
  async createBundle(@Body() dto: CreateBundleModel): Promise<AppApiResponse<BundleResponseModel>> {
    const result = await this.bundleService.createBundle(dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `Bundle "${result.title}" created successfully`,
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List bundles' })
  @ApiResponse({ status: 200, description: 'Bundles retrieved' })
  async listBundles(
    @Query() query: BundleQueryModel,
  ): Promise<AppApiResponse<{ data: BundleResponseModel[]; total: number }>> {
    const result = await this.bundleService.findAllBundles(query);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Bundles retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bundle with its reels' })
  @ApiParam({ name: 'id', description: 'Bundle UUID' })
  @ApiResponse({ status: 200, description: 'Bundle retrieved' })
  @ApiResponse({ status: 404, description: 'Bundle not found' })
  async getBundle(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppApiResponse<BundleResponseModel>> {
    const result = await this.bundleService.findOneBundle(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Bundle retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bundle' })
  @ApiParam({ name: 'id', description: 'Bundle UUID' })
  @ApiResponse({ status: 200, description: 'Bundle updated' })
  @ApiResponse({ status: 404, description: 'Bundle not found' })
  async updateBundle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBundleModel,
  ): Promise<AppApiResponse<BundleResponseModel>> {
    const result = await this.bundleService.updateBundle(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Bundle updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a bundle' })
  @ApiParam({ name: 'id', description: 'Bundle UUID' })
  @ApiResponse({ status: 200, description: 'Bundle deleted' })
  @ApiResponse({ status: 404, description: 'Bundle not found' })
  async deleteBundle(@Param('id', ParseUUIDPipe) id: string): Promise<AppApiResponse<null>> {
    await this.bundleService.removeBundle(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Bundle deleted successfully',
      data: null,
    };
  }

  // ── Reel endpoints ─────────────────────────────────────────────────────────────

  @Post(':id/reels')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a reel to a bundle' })
  @ApiParam({ name: 'id', description: 'Bundle UUID' })
  @ApiResponse({ status: 201, description: 'Reel added' })
  @ApiResponse({ status: 404, description: 'Bundle not found' })
  async addReel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReelModel,
  ): Promise<AppApiResponse<ReelResponseModel>> {
    const result = await this.bundleService.addReel(id, dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Reel added successfully',
      data: result,
    };
  }

  @Patch(':bundleId/reels/:reelId')
  @ApiOperation({ summary: 'Update a reel' })
  @ApiParam({ name: 'bundleId', description: 'Bundle UUID' })
  @ApiParam({ name: 'reelId', description: 'Reel UUID' })
  @ApiResponse({ status: 200, description: 'Reel updated' })
  @ApiResponse({ status: 404, description: 'Bundle or reel not found' })
  async updateReel(
    @Param('bundleId', ParseUUIDPipe) bundleId: string,
    @Param('reelId', ParseUUIDPipe) reelId: string,
    @Body() dto: UpdateReelModel,
  ): Promise<AppApiResponse<ReelResponseModel>> {
    const result = await this.bundleService.updateReel(bundleId, reelId, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Reel updated successfully',
      data: result,
    };
  }

  @Delete(':bundleId/reels/:reelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a reel from a bundle' })
  @ApiParam({ name: 'bundleId', description: 'Bundle UUID' })
  @ApiParam({ name: 'reelId', description: 'Reel UUID' })
  @ApiResponse({ status: 200, description: 'Reel removed' })
  @ApiResponse({ status: 404, description: 'Bundle or reel not found' })
  async removeReel(
    @Param('bundleId', ParseUUIDPipe) bundleId: string,
    @Param('reelId', ParseUUIDPipe) reelId: string,
  ): Promise<AppApiResponse<null>> {
    await this.bundleService.removeReel(bundleId, reelId);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Reel removed successfully',
      data: null,
    };
  }
}
