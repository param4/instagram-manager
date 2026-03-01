import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '../types/instagram.type';

/**
 * Request body for creating a new Instagram post or reel.
 *
 * @example
 * ```json
 * {
 *   "accountId": "550e8400-e29b-41d4-a716-446655440000",
 *   "mediaUrl": "https://example.com/photo.jpg",
 *   "caption": "Beautiful sunset!",
 *   "mediaType": "image"
 * }
 * ```
 */
export class CreatePostModel {
  /** UUID of the connected Instagram account to post from */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  /** Publicly accessible URL of the image or video to publish */
  @ApiProperty({ example: 'https://example.com/photo.jpg' })
  @IsUrl({}, { message: 'mediaUrl must be a valid, publicly accessible URL' })
  @IsNotEmpty()
  mediaUrl: string;

  /** Optional caption text for the post */
  @ApiPropertyOptional({ example: 'Beautiful sunset!' })
  @IsString()
  @IsOptional()
  caption?: string;

  /** Media type: `image` for photos, `reels` for videos. Defaults to `image` */
  @ApiPropertyOptional({ enum: MediaType, default: MediaType.IMAGE })
  @IsEnum(MediaType)
  @IsOptional()
  mediaType?: MediaType = MediaType.IMAGE;
}
