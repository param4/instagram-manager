import { IsNotEmpty, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request body for setting a custom thumbnail on a YouTube video.
 *
 * @example
 * ```json
 * {
 *   "accountId": "550e8400-e29b-41d4-a716-446655440000",
 *   "videoId": "550e8400-e29b-41d4-a716-446655440001",
 *   "thumbnailUrl": "https://example.com/thumbnail.jpg"
 * }
 * ```
 */
export class SetThumbnailModel {
  /** UUID of the connected YouTube account */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  /** UUID of the video record in our database */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsUUID()
  @IsNotEmpty()
  videoId: string;

  /** Publicly accessible URL of the thumbnail image */
  @ApiProperty({ example: 'https://example.com/thumbnail.jpg' })
  @IsUrl({}, { message: 'thumbnailUrl must be a valid, publicly accessible URL' })
  @IsNotEmpty()
  thumbnailUrl: string;
}
