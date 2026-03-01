import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PostStatus, MediaType } from '../types/instagram.type';
import { InstagramAccount } from './instagram-account.entity';

/**
 * Tracks an Instagram post through its entire lifecycle.
 *
 * Each post transitions through these statuses:
 * `PENDING` -> `CONTAINER_CREATED` -> `PROCESSING` -> `CONTAINER_FINISHED` -> `PUBLISHED`
 *
 * On failure at any stage, the status moves to `FAILED` with the
 * error message stored in {@link errorMessage}.
 */
@Entity('instagram_posts')
export class InstagramPost {
  /** Internal UUID primary key */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Whether this is an image post or a reel (video) */
  @Column({ type: 'varchar', length: 50 })
  mediaType: MediaType;

  /** Publicly accessible URL of the media file */
  @Column({ type: 'text' })
  mediaUrl: string;

  /** Optional caption text for the Instagram post */
  @Column({ type: 'text', nullable: true })
  caption: string | null;

  /** Current lifecycle status of the post */
  @Column({ type: 'varchar', length: 50, default: PostStatus.PENDING })
  status: PostStatus;

  /** Instagram API container ID (set after container creation) */
  @Column({ type: 'varchar', nullable: true })
  containerId: string | null;

  /** Instagram media ID (set after successful publishing) */
  @Column({ type: 'varchar', nullable: true })
  instagramMediaId: string | null;

  /** Error message if the post failed at any stage */
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  /** Permanent URL to the published Instagram post */
  @Column({ type: 'varchar', nullable: true })
  permalink: string | null;

  /** Foreign key to the Instagram account that owns this post */
  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  /** The Instagram account that published this post */
  @ManyToOne(() => InstagramAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountId' })
  account: InstagramAccount | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
