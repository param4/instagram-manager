import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateReelModel {
  @ApiPropertyOptional({ description: 'Storage key for the reel video file' })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ description: 'Display name of the reel' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Storage key for a preview thumbnail' })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Ordering position within the bundle' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}
