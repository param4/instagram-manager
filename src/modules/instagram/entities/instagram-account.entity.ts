import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Represents a connected Instagram account.
 *
 * Stores OAuth credentials and profile data obtained during the
 * Instagram Login flow. Each record corresponds to one Instagram
 * user who has authorized this application.
 *
 * Soft-deletion is used: setting {@link isActive} to `false`
 * hides the account from queries without removing the record.
 */
@Entity('instagram_accounts')
export class InstagramAccount {
  /** Internal UUID primary key */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Instagram user ID from the platform (unique per account) */
  @Column({ unique: true })
  igUserId: string;

  /** Instagram username (e.g. `@johndoe`) */
  @Column()
  username: string;

  /** Display name from the Instagram profile */
  @Column({ nullable: true, type: 'varchar', length: 255 })
  name: string | null;

  /** URL of the user's Instagram profile picture */
  @Column({ type: 'text', nullable: true })
  profilePictureUrl: string | null;

  /** Long-lived OAuth access token (valid ~60 days, auto-refreshed) */
  @Column({ type: 'text' })
  accessToken: string;

  /** When the current access token expires */
  @Column({ type: 'timestamptz' })
  tokenExpiresAt: Date;

  /** Whether this account is active. `false` indicates soft-deletion */
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
