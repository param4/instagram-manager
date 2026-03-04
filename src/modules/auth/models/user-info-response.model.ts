/** Public representation of user info from the auth provider */
export class UserInfoResponseModel {
  id: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  roles: string[];
  permissions: string[];
  orgId: string | null;
  mfaEnabled: boolean;
}
