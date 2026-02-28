import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import {
  CreateContainerResponse,
  ContainerStatusResponse,
  PublishMediaResponse,
  GraphApiErrorResponse,
  MediaType,
} from '../types/instagram.type';

@Injectable()
export class InstagramApiService {
  private readonly logger = new Logger(InstagramApiService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = `https://graph.instagram.com/${configService.igApiVersion}`;
  }

  async createMediaContainer(
    igUserId: string,
    accessToken: string,
    mediaUrl: string,
    mediaType: MediaType = MediaType.IMAGE,
    caption?: string,
  ): Promise<CreateContainerResponse> {
    const params = new URLSearchParams({
      access_token: accessToken,
    });

    if (mediaType === MediaType.REELS) {
      params.set('video_url', mediaUrl);
      params.set('media_type', 'REELS');
    } else {
      params.set('image_url', mediaUrl);
    }

    if (caption) {
      params.set('caption', caption);
    }

    const url = `${this.baseUrl}/${igUserId}/media?${params.toString()}`;
    const response = await fetch(url, { method: 'POST' });
    const data = (await response.json()) as CreateContainerResponse | GraphApiErrorResponse;

    if (!response.ok) {
      const error = data as GraphApiErrorResponse;
      this.logger.error(`Container creation failed: ${error.error.message}`);
      throw new Error(`Container creation failed: ${error.error.message}`);
    }

    return data as CreateContainerResponse;
  }

  async getContainerStatus(
    accessToken: string,
    containerId: string,
  ): Promise<ContainerStatusResponse> {
    const params = new URLSearchParams({
      fields: 'status_code',
      access_token: accessToken,
    });

    const url = `${this.baseUrl}/${containerId}?${params.toString()}`;
    const response = await fetch(url, { method: 'GET' });
    const data = (await response.json()) as ContainerStatusResponse | GraphApiErrorResponse;

    if (!response.ok) {
      const error = data as GraphApiErrorResponse;
      this.logger.error(`Container status check failed: ${error.error.message}`);
      throw new Error(`Container status check failed: ${error.error.message}`);
    }

    return data as ContainerStatusResponse;
  }

  async publishContainer(
    igUserId: string,
    accessToken: string,
    containerId: string,
  ): Promise<PublishMediaResponse> {
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    const url = `${this.baseUrl}/${igUserId}/media_publish?${params.toString()}`;
    const response = await fetch(url, { method: 'POST' });
    const data = (await response.json()) as PublishMediaResponse | GraphApiErrorResponse;

    if (!response.ok) {
      const error = data as GraphApiErrorResponse;
      this.logger.error(`Media publish failed: ${error.error.message}`);
      throw new Error(`Media publish failed: ${error.error.message}`);
    }

    return data as PublishMediaResponse;
  }
}
