import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { BundleStatus } from '../types/bundle.type';

export class UpdateBundleModel {
  @ApiPropertyOptional({ description: 'Display name of the bundle' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the bundle' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BundleStatus, description: 'Lifecycle status' })
  @IsOptional()
  @IsEnum(BundleStatus)
  status?: BundleStatus;

  @ApiPropertyOptional({ description: 'Comma-separated category labels' })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiPropertyOptional({ description: 'Storage key for the bundle cover image' })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;
}
