import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteObjectModel {
  @ApiProperty({ example: 'uploads/my-video.mp4' })
  @IsString()
  @IsNotEmpty()
  key: string;
}
