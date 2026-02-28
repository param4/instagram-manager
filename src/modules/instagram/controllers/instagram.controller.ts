import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { InstagramService } from '../services/instagram.service';
import { InstagramOAuthService } from '../services/instagram-oauth.service';
import { CreatePostModel } from '../models/create-post.model';
import { ApiResponse } from '@common/types/response.type';
import { PostResponseModel } from '../models/post-response.model';
import { AccountResponseModel } from '../models/account-response.model';
import { ConnectResponseModel } from '../models/connect-response.model';
import { InstagramAccount } from '../entities/instagram-account.entity';
import { MediaType } from '../types/instagram.type';

@Controller('instagram')
export class InstagramController {
  constructor(
    private readonly instagramService: InstagramService,
    private readonly instagramOAuthService: InstagramOAuthService,
  ) {}

  // ── OAuth ────────────────────────────────────────────────────────────────────

  @Get('auth/connect')
  getConnectUrl(): ApiResponse<ConnectResponseModel> {
    const authUrl = this.instagramOAuthService.getAuthUrl();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Open the authUrl in a browser to connect your Instagram account',
      data: { authUrl },
    };
  }

  @Get('auth/callback')
  async handleCallback(@Query('code') code: string): Promise<ApiResponse<AccountResponseModel>> {
    if (!code) {
      throw new HttpException('Missing OAuth code', HttpStatus.BAD_REQUEST);
    }

    const { accessToken, expiresAt } = await this.instagramOAuthService.exchangeCodeForToken(code);

    const profile = await this.instagramOAuthService.getProfile(accessToken);
    const account = await this.instagramOAuthService.upsertAccount(profile, accessToken, expiresAt);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `Instagram account @${account.username} connected successfully`,
      data: this.toAccountResponse(account),
    };
  }

  // ── Accounts ─────────────────────────────────────────────────────────────────

  @Get('accounts')
  async listAccounts(): Promise<ApiResponse<AccountResponseModel[]>> {
    const accounts = await this.instagramOAuthService.listAccounts();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Accounts retrieved successfully',
      data: accounts.map((a) => this.toAccountResponse(a)),
    };
  }

  @Delete('accounts/:id')
  @HttpCode(HttpStatus.OK)
  async disconnectAccount(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<null>> {
    await this.instagramOAuthService.deactivateAccount(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Account disconnected successfully',
      data: null,
    };
  }

  // ── Posts ─────────────────────────────────────────────────────────────────────

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  async createPost(@Body() dto: CreatePostModel): Promise<ApiResponse<PostResponseModel>> {
    const post = await this.instagramService.createPost(dto);
    const typeLabel = dto.mediaType === MediaType.REELS ? 'reel' : 'post';
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: `Instagram ${typeLabel} published successfully`,
      data: post,
    };
  }

  @Get('posts')
  async listPosts(): Promise<ApiResponse<PostResponseModel[]>> {
    const posts = await this.instagramService.listPosts();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Posts retrieved successfully',
      data: posts,
    };
  }

  @Get('posts/:id')
  async getPost(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<PostResponseModel>> {
    const post = await this.instagramService.getPost(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Post retrieved successfully',
      data: post,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private toAccountResponse(account: InstagramAccount): AccountResponseModel {
    return {
      id: account.id,
      igUserId: account.igUserId,
      username: account.username,
      name: account.name,
      profilePictureUrl: account.profilePictureUrl,
      tokenExpiresAt: account.tokenExpiresAt,
      isActive: account.isActive,
      createdAt: account.createdAt,
    };
  }
}
