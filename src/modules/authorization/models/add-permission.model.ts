import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { PermissionAction, PermissionScope } from '../types/authorization.type';

export class AddPermissionModel {
  @ApiProperty({ description: 'Resource name (e.g. instagram-post, user)' })
  @IsNotEmpty()
  @IsString()
  resource: string;

  @ApiProperty({ enum: PermissionAction })
  @IsNotEmpty()
  @IsEnum(PermissionAction)
  action: string;

  @ApiProperty({ enum: PermissionScope })
  @IsNotEmpty()
  @IsEnum(PermissionScope)
  scope: string;
}
