import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  Matches,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class CreateBusinessModel {
  @ApiProperty({ description: 'Business display name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'URL-friendly unique identifier', example: 'acme-corp' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  slug: string;

  @ApiProperty({ description: 'Email of the initial business admin' })
  @IsNotEmpty()
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ description: 'Name of the initial business admin' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  adminName: string;

  @ApiProperty({ description: 'Username for the admin in the auth provider' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  adminUsername: string;

  @ApiPropertyOptional({ description: 'Password for the admin (if auth provider supports it)' })
  @IsOptional()
  @IsString()
  adminPassword?: string;

  @ApiPropertyOptional({ description: 'Maximum number of users allowed' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Subscription plan identifier' })
  @IsOptional()
  @IsString()
  subscriptionPlan?: string;
}
