import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  DeepPartial,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import { BusinessContextService } from '../services/business-context.service';

/**
 * Generic base repository that automatically scopes every query
 * to the current business.
 *
 * Each business-scoped entity should have a concrete subclass:
 *
 * ```ts
 * @Injectable()
 * export class UserBusinessRepository extends BusinessBaseRepository<User> {
 *   constructor(
 *     @InjectRepository(User) repo: Repository<User>,
 *     ctx: BusinessContextService,
 *   ) {
 *     super(repo, ctx, 'user');
 *   }
 * }
 * ```
 *
 * **Super admin bypass**: when `BusinessContextService.isSuperAdmin()`
 * is true, the business_id filter is NOT applied so the caller can
 * operate across businesses.
 */
export abstract class BusinessBaseRepository<T extends ObjectLiteral> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly businessContext: BusinessContextService,
    /** The entity alias used in query builders (e.g. 'user', 'role'). */
    protected readonly entityAlias: string,
  ) {}

  // ── Reads ──────────────────────────────────────────────────────────────

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(this.applyBusinessScope(options));
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(this.applyBusinessScope(options));
  }

  async findOneBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<T | null> {
    return this.repository.findOneBy(this.mergeWhere(where));
  }

  async findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    return this.repository.findAndCount(this.applyBusinessScope(options));
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(this.applyBusinessScope(options));
  }

  // ── Writes ─────────────────────────────────────────────────────────────

  async save(entity: DeepPartial<T>): Promise<T>;
  async save(entities: DeepPartial<T>[]): Promise<T[]>;
  async save(entityOrEntities: DeepPartial<T> | DeepPartial<T>[]): Promise<T | T[]> {
    if (Array.isArray(entityOrEntities)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const stamped = entityOrEntities.map((e) => this.stampBusinessId(e));
      return this.repository.save(stamped);
    }
    return this.repository.save(this.stampBusinessId(entityOrEntities));
  }

  create(entityLike: DeepPartial<T>): T {
    return this.repository.create(this.stampBusinessId(entityLike));
  }

  // ── Deletes ────────────────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    const where = this.mergeWhereSingle({ id } as unknown as FindOptionsWhere<T>);
    await this.repository.softDelete(where);
  }

  async delete(id: string): Promise<void> {
    const where = this.mergeWhereSingle({ id } as unknown as FindOptionsWhere<T>);
    await this.repository.delete(where);
  }

  // ── Query Builder ──────────────────────────────────────────────────────

  createQueryBuilder(alias?: string): SelectQueryBuilder<T> {
    const qb = this.repository.createQueryBuilder(alias ?? this.entityAlias);

    if (!this.businessContext.isSuperAdmin()) {
      const businessId = this.businessContext.getBusinessId();
      qb.andWhere(`${alias ?? this.entityAlias}.business_id = :businessId`, {
        businessId,
      });
    }

    return qb;
  }

  /** Expose the underlying TypeORM repository for advanced/one-off queries. */
  get raw(): Repository<T> {
    return this.repository;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private applyBusinessScope<O extends FindManyOptions<T> | FindOneOptions<T>>(options?: O): O {
    if (this.businessContext.isSuperAdmin()) {
      return (options ?? {}) as O;
    }

    const businessId = this.businessContext.getBusinessId();
    const opts = (options ?? {}) as FindManyOptions<T>;
    const existing = (opts.where ?? {}) as FindOptionsWhere<T>;

    if (Array.isArray(existing)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      opts.where = existing.map((w) => ({
        ...w,
        business_id: businessId,
      })) as FindOptionsWhere<T>[];
    } else {
      opts.where = {
        ...existing,
        business_id: businessId,
      } as FindOptionsWhere<T>;
    }

    return opts as O;
  }

  private mergeWhere(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (this.businessContext.isSuperAdmin()) {
      return where;
    }
    const businessId = this.businessContext.getBusinessId();
    if (Array.isArray(where)) {
      return where.map((w) => ({ ...w, business_id: businessId })) as FindOptionsWhere<T>[];
    }
    return { ...where, business_id: businessId } as FindOptionsWhere<T>;
  }

  private mergeWhereSingle(where: FindOptionsWhere<T>): FindOptionsWhere<T> {
    if (this.businessContext.isSuperAdmin()) {
      return where;
    }
    const businessId = this.businessContext.getBusinessId();
    return { ...where, business_id: businessId } as FindOptionsWhere<T>;
  }

  private stampBusinessId(entity: DeepPartial<T>): DeepPartial<T> {
    if (this.businessContext.isSuperAdmin()) {
      return entity;
    }
    const businessId = this.businessContext.getBusinessId();
    return { ...entity, business_id: businessId } as DeepPartial<T>;
  }
}
