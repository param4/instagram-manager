import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Bundle } from './bundle.entity';

/**
 * A single reel (short video) belonging to a {@link Bundle}.
 *
 * Reels are ordered within their parent bundle by the {@link position} field.
 * Hard-deleted when removed; the database cascades deletion when the
 * parent bundle row is permanently removed.
 */
@Entity('reels')
export class Reel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Display name of the reel */
  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  /** Storage key for the reel video file (provider-agnostic) */
  @Column({ type: 'text' })
  storageKey: string;

  /** Storage key for a preview thumbnail image */
  @Column({ type: 'text', nullable: true })
  thumbnailKey: string | null;

  /** Duration of the reel in seconds */
  @Column({ type: 'integer', nullable: true })
  duration: number | null;

  /** Ordering position within the parent bundle */
  @Column({ type: 'integer', nullable: true })
  position: number | null;

  /** Foreign key to the parent bundle */
  @Column({ type: 'uuid' })
  @Index()
  bundleId: string;

  /** The bundle this reel belongs to */
  @ManyToOne(() => Bundle, (bundle) => bundle.reels, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bundleId' })
  bundle: Bundle;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
