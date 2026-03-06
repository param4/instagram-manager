export class RoleResponseModel {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: { id: string; resource: string; action: string; scope: string }[];
  userCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
