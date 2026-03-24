import { Controller, Post, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorageService } from '../services/storage.service';
import { SignedUploadUrlModel } from '../models/signed-upload-url.model';
import { SignedDownloadUrlModel } from '../models/signed-download-url.model';
import { DeleteObjectModel } from '../models/delete-object.model';
import { ApiResponse as AppApiResponse } from '@common/types/response.type';
import { SignedUploadUrlResult } from '../types/storage.type';
import { Public } from '@common/decorators/public.decorator';

@ApiTags('storage')
@Controller('storage')
@Public()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('signed-upload-url')
  @ApiOperation({ summary: 'Get a presigned URL for client-side upload' })
  @ApiResponse({ status: 200, description: 'Presigned upload URL generated' })
  async getSignedUploadUrl(
    @Body() body: SignedUploadUrlModel,
  ): Promise<AppApiResponse<SignedUploadUrlResult>> {
    const result = await this.storageService.getSignedUploadUrl(body);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Presigned upload URL generated',
      data: result,
    };
  }

  @Post('signed-download-url')
  @ApiOperation({ summary: 'Get a presigned URL to download/view a file' })
  @ApiResponse({ status: 200, description: 'Presigned download URL generated' })
  async getSignedDownloadUrl(
    @Body() body: SignedDownloadUrlModel,
  ): Promise<AppApiResponse<{ url: string }>> {
    const url = await this.storageService.getSignedUrl(body);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Presigned download URL generated',
      data: { url },
    };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file from storage' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  async deleteObject(@Body() body: DeleteObjectModel): Promise<void> {
    await this.storageService.delete(body.key);
  }
}
