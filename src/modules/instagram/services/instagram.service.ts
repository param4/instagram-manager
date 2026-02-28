import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@config/config.service';
import { InstagramPost } from '../entities/instagram-post.entity';
import { PostStatus, MediaType } from '../types/instagram.type';
import { InstagramApiService } from './instagram-api.service';
import { InstagramOAuthService } from './instagram-oauth.service';
import { CreatePostModel } from '../models/create-post.model';
import { PostResponseModel } from '../models/post-response.model';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly pollingIntervalMs: number;
  private readonly maxPollingAttempts: number;

  constructor(
    @InjectRepository(InstagramPost)
    private readonly postRepository: Repository<InstagramPost>,
    private readonly instagramApiService: InstagramApiService,
    private readonly instagramOAuthService: InstagramOAuthService,
    private readonly configService: ConfigService,
  ) {
    this.pollingIntervalMs = configService.igPollingIntervalMs;
    this.maxPollingAttempts = configService.igMaxPollingAttempts;
  }

  async createPost(dto: CreatePostModel): Promise<PostResponseModel> {
    const account = await this.instagramOAuthService.getAccount(dto.accountId);
    const refreshedAccount = await this.instagramOAuthService.refreshTokenIfNeeded(account);

    const mediaType = dto.mediaType ?? MediaType.IMAGE;

    const post = this.postRepository.create({
      mediaType,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption ?? null,
      status: PostStatus.PENDING,
      accountId: refreshedAccount.id,
    });
    await this.postRepository.save(post);

    try {
      const container = await this.instagramApiService.createMediaContainer(
        refreshedAccount.igUserId,
        refreshedAccount.accessToken,
        dto.mediaUrl,
        mediaType,
        dto.caption,
      );
      post.containerId = container.id;
      post.status = PostStatus.CONTAINER_CREATED;
      await this.postRepository.save(post);
      this.logger.log(`Container created: ${container.id} for post ${post.id}`);

      await this.waitForContainerReady(post, refreshedAccount.accessToken);

      const published = await this.instagramApiService.publishContainer(
        refreshedAccount.igUserId,
        refreshedAccount.accessToken,
        post.containerId,
      );
      post.instagramMediaId = published.id;
      post.status = PostStatus.PUBLISHED;
      await this.postRepository.save(post);
      this.logger.log(`Post published: IG media ID ${published.id}`);

      return this.toResponse(post);
    } catch (error) {
      post.status = PostStatus.FAILED;
      post.errorMessage = error instanceof Error ? error.message : String(error);
      await this.postRepository.save(post);
      this.logger.error(`Post ${post.id} failed: ${post.errorMessage}`);

      throw new HttpException(
        {
          message: 'Instagram post failed',
          detail: post.errorMessage,
          postId: post.id,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getPost(id: string): Promise<PostResponseModel> {
    const post = await this.postRepository.findOneBy({ id });
    if (!post) {
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
    }
    return this.toResponse(post);
  }

  async listPosts(): Promise<PostResponseModel[]> {
    const posts = await this.postRepository.find({
      order: { createdAt: 'DESC' },
    });
    return posts.map((p) => this.toResponse(p));
  }

  private async waitForContainerReady(post: InstagramPost, accessToken: string): Promise<void> {
    post.status = PostStatus.PROCESSING;
    await this.postRepository.save(post);

    const isReel = post.mediaType === MediaType.REELS;
    const maxAttempts = isReel ? this.maxPollingAttempts * 3 : this.maxPollingAttempts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.instagramApiService.getContainerStatus(
        accessToken,
        post.containerId!,
      );
      this.logger.debug(
        `Container ${post.containerId} status: ${status.status_code} (attempt ${attempt + 1})`,
      );

      if (status.status_code === 'FINISHED') {
        post.status = PostStatus.CONTAINER_FINISHED;
        await this.postRepository.save(post);
        return;
      }

      if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
        throw new Error(
          `Container ${post.containerId} reached terminal status: ${status.status_code}`,
        );
      }

      await this.sleep(this.pollingIntervalMs);
    }

    throw new Error(`Container ${post.containerId} did not finish within ${maxAttempts} attempts`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toResponse(post: InstagramPost): PostResponseModel {
    return {
      id: post.id,
      mediaType: post.mediaType,
      mediaUrl: post.mediaUrl,
      caption: post.caption,
      status: post.status,
      instagramMediaId: post.instagramMediaId,
      permalink: post.permalink,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
