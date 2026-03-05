import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Represents a connected YouTube channel.
 *
 * Stores Google OAuth credentials and channel profile data obtained
 * during the Google OAuth 2.0 consent flow. Each record corresponds
 * to one YouTube channel that has authorized this application.
 *
 * Uses TypeORM's `@DeleteDateColumn` for soft-deletion. Standard
 * `find()` queries automatically exclude soft-deleted rows.
 * Use `{ withDeleted: true }` to include them.
 */
@Entity('youtube_accounts')
export class YouTubeAccount {
  /** Internal UUID primary key */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** YouTube channel ID (unique per channel) */
  @Column({ unique: true })
  channelId: string;

  /** Channel title / display name */
  @Column()
  channelTitle: string;

  /** Channel custom URL (e.g. @username), nullable */
  @Column({ type: 'varchar', length: 255, nullable: true })
  customUrl: string | null;

  /** Channel thumbnail URL */
  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string | null;

  /** Google OAuth access token (valid ~1 hour) */
  @Column({ type: 'text' })
  accessToken: string;

  /** Google OAuth refresh token (long-lived, used to mint new access tokens) */
  @Column({ type: 'text' })
  refreshToken: string;

  /** When the current access token expires */
  @Column({ type: 'timestamptz' })
  tokenExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /** Set by TypeORM on soft-delete. `null` when account is active */
  @DeleteDateColumn()
  deletedAt: Date | null;
}
