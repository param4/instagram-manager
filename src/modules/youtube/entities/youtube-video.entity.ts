import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VideoStatus, VideoType, PrivacyStatus } from '../types/youtube.type';
import { YouTubeAccount } from './youtube-account.entity';

/**
 * Tracks a YouTube video upload through its entire lifecycle.
 *
 * Each video transitions through these statuses:
 * `PENDING` -> `UPLOADING` -> `PROCESSING` -> `PUBLISHED`
 *
 * On failure at any stage, the status moves to `FAILED` with the
 * error message stored in {@link errorMessage}.
 */
@Entity('youtube_videos')
export class YouTubeVideo {
  /** Internal UUID primary key */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Whether this is a standard video or a Short */
  @Column({ type: 'varchar', length: 50 })
  videoType: VideoType;

  /** Source URL of the video file to upload */
  @Column({ type: 'text' })
  videoUrl: string;

  /** Video title (required by YouTube API) */
  @Column({ type: 'varchar', length: 100 })
  title: string;

  /** Video description */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Comma-separated tags */
  @Column({ type: 'text', nullable: true })
  tags: string | null;

  /** Privacy setting for the upload */
  @Column({ type: 'varchar', length: 20, default: PrivacyStatus.PRIVATE })
  privacyStatus: PrivacyStatus;

  /** Current lifecycle status */
  @Column({ type: 'varchar', length: 50, default: VideoStatus.PENDING })
  status: VideoStatus;

  /** YouTube video ID assigned after upload */
  @Column({ type: 'varchar', nullable: true })
  youtubeVideoId: string | null;

  /** Full YouTube URL to the video */
  @Column({ type: 'varchar', nullable: true })
  youtubeUrl: string | null;

  /** URL of custom thumbnail (set after upload) */
  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string | null;

  /** Error message if failed at any stage */
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  /** Foreign key to the YouTube account that owns this video */
  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  /** The YouTube account that uploaded this video */
  @ManyToOne(() => YouTubeAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountId' })
  account: YouTubeAccount | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
