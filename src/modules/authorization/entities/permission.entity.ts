import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { PermissionAction, PermissionScope } from '../types/authorization.type';

@Entity('permissions')
@Index(['businessId', 'resource', 'action', 'scope'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'business_id' })
  @Index()
  businessId: string;

  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({ type: 'enum', enum: PermissionAction })
  action: PermissionAction;

  @Column({ type: 'enum', enum: PermissionScope })
  scope: PermissionScope;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
