import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserHierarchy } from '@modules/users/entities/user-hierarchy.entity';

/**
 * Resolves the reporting hierarchy for scope-based data filtering.
 *
 * Provides recursive subordinate lookup (all users below a given user
 * in the reporting chain). Results are cached with a TTL and invalidated
 * on hierarchy changes.
 */
@Injectable()
export class HierarchyService {
  private readonly logger = new Logger(HierarchyService.name);
  private cache = new Map<string, { ids: string[]; expiresAt: number }>();
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(UserHierarchy)
    private readonly hierarchyRepo: Repository<UserHierarchy>,
  ) {}

  /**
   * Returns all subordinate user IDs (direct and indirect reports).
   * Uses a recursive CTE query.
   */
  async getSubordinateIds(userId: string, businessId: string): Promise<string[]> {
    const cacheKey = `${userId}:${businessId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.ids;
    }

    const result: Array<{ user_id: string }> = await this.hierarchyRepo.query(
      `
      WITH RECURSIVE subordinates AS (
        SELECT user_id FROM user_hierarchy
        WHERE manager_id = $1 AND business_id = $2
        UNION ALL
        SELECT uh.user_id FROM user_hierarchy uh
        INNER JOIN subordinates s ON uh.manager_id = s.user_id
      )
      SELECT user_id FROM subordinates
      `,
      [userId, businessId],
    );

    const ids = result.map((r) => r.user_id);
    this.cache.set(cacheKey, { ids, expiresAt: Date.now() + this.ttlMs });
    return ids;
  }

  /** Invalidate cache for a specific business (called on hierarchy changes). */
  invalidate(businessId: string): void {
    for (const [key] of this.cache) {
      if (key.endsWith(`:${businessId}`)) {
        this.cache.delete(key);
      }
    }
  }
}
