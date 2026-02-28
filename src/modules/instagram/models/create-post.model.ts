import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { MediaType } from '../types/instagram.type';

export class CreatePostModel {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsUrl({}, { message: 'mediaUrl must be a valid, publicly accessible URL' })
  @IsNotEmpty()
  mediaUrl: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsEnum(MediaType)
  @IsOptional()
  mediaType?: MediaType = MediaType.IMAGE;
}
