export class AccountResponseModel {
  id: string;
  igUserId: string;
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
  tokenExpiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}
