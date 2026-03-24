import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateReelModel } from './create-reel.model';

export class CreateBundleModel {
  @ApiProperty({ description: 'Display name of the bundle' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Description of the bundle' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Comma-separated category labels' })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiPropertyOptional({ description: 'Storage key for the bundle cover image' })
  @IsOptional()
  @IsString()
  thumbnailKey?: string;

  @ApiPropertyOptional({ type: [CreateReelModel], description: 'Reels to create with the bundle' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReelModel)
  reels?: CreateReelModel[];
}
