import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { TeamRole } from '@modules/authorization/types/authorization.type';

export class AddMemberModel {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: TeamRole })
  @IsOptional()
  @IsEnum(TeamRole)
  roleInTeam?: TeamRole;
}
