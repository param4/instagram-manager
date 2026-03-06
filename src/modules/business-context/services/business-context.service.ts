import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { BusinessContextStore } from '../types/business-context.type';

/**
 * Provides request-scoped business context via AsyncLocalStorage.
 *
 * A middleware wraps each request in `run()` with a mutable store object.
 * The {@link BusinessContextGuard} then populates the store fields after
 * AuthGuard has verified the token. Services read the context through
 * the helpers below.
 */
@Injectable()
export class BusinessContextService {
  private readonly storage = new AsyncLocalStorage<BusinessContextStore>();

  /** Start a new async context wrapping the given callback. */
  run<T>(store: BusinessContextStore, fn: () => T): T {
    return this.storage.run(store, fn);
  }

  /** Populate the current store in-place. Used by the guard. */
  populate(data: BusinessContextStore): void {
    const store = this.storage.getStore();
    if (store) {
      store.businessId = data.businessId;
      store.userId = data.userId;
      store.isSuperAdmin = data.isSuperAdmin;
    }
  }

  /**
   * Returns the current business ID.
   *
   * @throws ForbiddenException if no business context exists and the
   *         caller is not a super admin.
   */
  getBusinessId(): string {
    const store = this.storage.getStore();

    if (store?.isSuperAdmin) {
      return store.businessId as string;
    }

    if (!store?.businessId) {
      throw new ForbiddenException('No business context — access denied');
    }

    return store.businessId;
  }

  /** Returns the current business ID or null (no throw). */
  getBusinessIdOrNull(): string | null {
    return this.storage.getStore()?.businessId ?? null;
  }

  /** Returns the auth-provider user ID for the current request. */
  getCurrentUserId(): string {
    const store = this.storage.getStore();
    if (!store?.userId) {
      throw new ForbiddenException('No user context — access denied');
    }
    return store.userId;
  }

  /** Whether the current request is from a super admin. */
  isSuperAdmin(): boolean {
    return this.storage.getStore()?.isSuperAdmin ?? false;
  }
}
