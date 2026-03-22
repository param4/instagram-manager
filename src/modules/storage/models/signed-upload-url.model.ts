import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignedUploadUrlModel {
  @ApiProperty({ example: 'uploads/my-video.mp4' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiPropertyOptional({ example: 3600, description: 'Expiry in seconds (default: 3600)' })
  @IsOptional()
  @IsInt()
  @Min(60)
  expiresIn?: number;
}
