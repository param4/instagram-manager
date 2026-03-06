import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BusinessStatus } from '../types/business.type';

/**
 * Represents a tenant business on the platform.
 *
 * Created by super admins. Every non-super-admin user belongs to
 * exactly one business, and all their data is isolated via the
 * {@link BusinessBaseRepository}.
 */
@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'enum', enum: BusinessStatus, default: BusinessStatus.ACTIVE })
  status: BusinessStatus;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subscriptionPlan: string | null;

  @Column({ type: 'integer', nullable: true })
  maxUsers: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
