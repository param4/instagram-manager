import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Team } from './team.entity';
import { TeamRole } from '@modules/authorization/types/authorization.type';

@Entity('user_teams')
export class UserTeam {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId: string;

  @PrimaryColumn({ type: 'uuid', name: 'team_id' })
  teamId: string;

  @Column({ type: 'enum', enum: TeamRole, nullable: true, name: 'role_in_team' })
  roleInTeam: TeamRole | null;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
