import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Request body for the token refresh endpoint */
export class RefreshTokenModel {
  @ApiProperty({
    description: 'The refresh token to exchange for a new access token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
