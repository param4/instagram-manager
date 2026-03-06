import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginModel {
  @ApiProperty({ example: 'super-admin@gmail.com', description: 'Email or username' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'MyStr0ngP@ss' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
