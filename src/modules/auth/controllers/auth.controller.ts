import { Controller, Post, Get, Body, HttpStatus, HttpCode, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RefreshTokenModel } from '../models/refresh-token.model';
import { TokenResponseModel } from '../models/token-response.model';
import { UserInfoResponseModel } from '../models/user-info-response.model';
import { ApiResponse as AppApiResponse } from '@common/types/response.type';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { AuthUser } from '../types/auth.type';

/**
 * Authentication endpoints.
 *
 * Provides token refresh and user info retrieval.
 * Token verification is handled globally by the AuthGuard.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Refreshes an access token using a refresh token.
   * Only available for providers that support server-side refresh
   * (WorkOS, Stytch). Returns 501 for providers that don't.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh an access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 501,
    description: 'Provider does not support token refresh',
  })
  async refreshToken(@Body() dto: RefreshTokenModel): Promise<AppApiResponse<TokenResponseModel>> {
    const result = await this.authService.refreshToken(dto.refreshToken);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      },
    };
  }

  /** Returns the authenticated user's profile information from the provider */
  @Get('me')
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({
    status: 200,
    description: 'User info retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getMe(
    @CurrentUser() user: AuthUser,
    @Headers('authorization') authHeader: string,
  ): Promise<AppApiResponse<UserInfoResponseModel>> {
    const token = authHeader?.split(' ')[1] ?? '';
    const userInfo = await this.authService.getUserInfo(user.id, token);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User info retrieved successfully',
      data: {
        id: userInfo.id,
        email: userInfo.email,
        emailVerified: userInfo.emailVerified,
        name: userInfo.name,
        picture: userInfo.picture,
        roles: userInfo.roles,
        permissions: userInfo.permissions,
        orgId: userInfo.orgId,
        mfaEnabled: userInfo.mfaEnabled,
      },
    };
  }

  /** Lightweight endpoint to verify the current token is valid */
  @Get('verify')
  @ApiOperation({ summary: 'Verify current token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Token is invalid or expired' })
  verifyToken(@CurrentUser() user: AuthUser): AppApiResponse<{ id: string; email: string | null }> {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Token is valid',
      data: { id: user.id, email: user.email },
    };
  }
}
