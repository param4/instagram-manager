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

@Entity('instagram_posts')
export class InstagramPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  mediaType: MediaType;

  @Column({ type: 'text' })
  mediaUrl: string;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ type: 'varchar', length: 50, default: PostStatus.PENDING })
  status: PostStatus;

  @Column({ type: 'varchar', nullable: true })
  containerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  instagramMediaId: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'varchar', nullable: true })
  permalink: string | null;

  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  @ManyToOne(() => InstagramAccount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountId' })
  account: InstagramAccount | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
