/**
 * Shape of the data stored in AsyncLocalStorage per request.
 *
 * Populated by {@link BusinessContextGuard} after the AuthGuard has
 * attached the JWT user to the request.
 */
export type BusinessContextStore = {
  /** Business ID from the JWT `orgId` claim */
  businessId: string | null;

  /** Auth-provider user ID from the JWT `id` claim */
  userId: string;

  /** Whether the current user is a platform super admin */
  isSuperAdmin: boolean;
};
