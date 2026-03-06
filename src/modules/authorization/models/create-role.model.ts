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
import { AddPermissionModel } from './add-permission.model';

export class CreateRoleModel {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [AddPermissionModel] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddPermissionModel)
  permissions?: AddPermissionModel[];
}
