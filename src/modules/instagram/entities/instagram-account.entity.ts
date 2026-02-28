import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('instagram_accounts')
export class InstagramAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  igUserId: string;

  @Column()
  username: string;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  profilePictureUrl: string | null;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'timestamptz' })
  tokenExpiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
