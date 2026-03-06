import { BusinessStatus } from '../types/business.type';

export class BusinessResponseModel {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  settings: Record<string, unknown> | null;
  subscriptionPlan: string | null;
  maxUsers: number | null;
  userCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
