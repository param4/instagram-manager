import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoType, PrivacyStatus } from '../types/youtube.type';

/**
 * Request body for uploading a YouTube video or Short.
 *
 * @example
 * ```json
 * {
 *   "accountId": "550e8400-e29b-41d4-a716-446655440000",
 *   "videoUrl": "https://example.com/video.mp4",
 *   "title": "My Awesome Video",
 *   "description": "Check out this video!",
 *   "tags": "travel,vlog,adventure",
 *   "videoType": "video",
 *   "privacyStatus": "private"
 * }
 * ```
 */
export class UploadVideoModel {
  /** UUID of the connected YouTube account to upload from */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  /** Publicly accessible URL of the video file */
  @ApiProperty({ example: 'https://example.com/video.mp4' })
  @IsUrl({}, { message: 'videoUrl must be a valid, publicly accessible URL' })
  @IsNotEmpty()
  videoUrl: string;

  /** Video title (max 100 characters per YouTube limits) */
  @ApiProperty({ example: 'My Awesome Video' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  /** Video description */
  @ApiPropertyOptional({ example: 'Check out this video!' })
  @IsString()
  @IsOptional()
  description?: string;

  /** Comma-separated tags */
  @ApiPropertyOptional({ example: 'travel,vlog,adventure' })
  @IsString()
  @IsOptional()
  tags?: string;

  /** Video type: `video` for long-form, `short` for Shorts. Defaults to `video` */
  @ApiPropertyOptional({ enum: VideoType, default: VideoType.VIDEO })
  @IsEnum(VideoType)
  @IsOptional()
  videoType?: VideoType = VideoType.VIDEO;

  /** Privacy: `public`, `private`, `unlisted`. Defaults to `private` */
  @ApiPropertyOptional({ enum: PrivacyStatus, default: PrivacyStatus.PRIVATE })
  @IsEnum(PrivacyStatus)
  @IsOptional()
  privacyStatus?: PrivacyStatus = PrivacyStatus.PRIVATE;
}
