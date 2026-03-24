import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BundleStatus } from '../types/bundle.type';
import { Reel } from './reel.entity';

/**
 * A collection of {@link Reel}s grouped for publishing or organisation.
 *
 * Bundles move through a `draft → published → archived` lifecycle.
 * When the status transitions to `published`, {@link publishedAt} is
 * automatically set by the service layer.
 *
 * Soft-deleted via {@link deletedAt}; child reels remain in the
 * database but become invisible because the parent bundle is filtered
 * out of standard queries.
 */
@Entity('bundles')
export class Bundle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Business that owns this bundle (multi-tenant isolation) */
  @Column({ type: 'varchar', name: 'business_id', nullable: true })
  @Index()
  businessId: string | null;

  /** Display name of the bundle */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** Optional description */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Lifecycle status */
  @Column({ type: 'varchar', length: 50, default: BundleStatus.DRAFT })
  status: BundleStatus;

  /** Storage key for the bundle cover image (provider-agnostic) */
  @Column({ type: 'text', nullable: true })
  thumbnailKey: string | null;

  /** Timestamp when the bundle was first published */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  /** Comma-separated category labels for discoverability */
  @Column({ type: 'text', nullable: true })
  categories: string | null;

  /** Child reels belonging to this bundle */
  @OneToMany(() => Reel, (reel) => reel.bundle)
  reels: Reel[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
