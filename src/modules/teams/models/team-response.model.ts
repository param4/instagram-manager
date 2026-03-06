export class TeamResponseModel {
  id: string;
  name: string;
  parentTeamId: string | null;
  members?: { userId: string; roleInTeam: string | null }[];
  createdAt: Date;
  updatedAt: Date;
}
