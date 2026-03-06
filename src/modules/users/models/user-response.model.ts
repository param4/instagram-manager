import { UserStatus } from '../types/user.type';

export class UserResponseModel {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  roles?: { id: string; name: string }[];
  teams?: { id: string; name: string }[];
  managerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
