import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bundle } from '../entities/bundle.entity';
import { Reel } from '../entities/reel.entity';
import { BundleStatus } from '../types/bundle.type';
import { CreateBundleModel } from '../models/create-bundle.model';
import { UpdateBundleModel } from '../models/update-bundle.model';
import { BundleQueryModel } from '../models/bundle-query.model';
import { BundleResponseModel } from '../models/bundle-response.model';
import { CreateReelModel } from '../models/create-reel.model';
import { UpdateReelModel } from '../models/update-reel.model';
import { ReelResponseModel } from '../models/reel-response.model';
import { BusinessContextService } from '@modules/business-context/services/business-context.service';
import { StorageService } from '@modules/storage/services/storage.service';

@Injectable()
export class BundleService {
  private readonly logger = new Logger(BundleService.name);

  constructor(
    @InjectRepository(Bundle)
    private readonly bundleRepo: Repository<Bundle>,
    @InjectRepository(Reel)
    private readonly reelRepo: Repository<Reel>,
    private readonly businessContext: BusinessContextService,
    private readonly storageService: StorageService,
  ) {}

  // ── Bundle CRUD ────────────────────────────────────────────────────────────────

  async createBundle(dto: CreateBundleModel): Promise<BundleResponseModel> {
    const businessId = this.businessContext.getBusinessId();

    const bundle = this.bundleRepo.create({
      businessId,
      title: dto.title,
      description: dto.description ?? null,
      categories: dto.categories ?? null,
      thumbnailKey: dto.thumbnailKey ?? null,
    });
    const savedBundle = await this.bundleRepo.save(bundle);

    let savedReels: Reel[] = [];
    if (dto.reels?.length) {
      const reels = dto.reels.map((r) =>
        this.reelRepo.create({
          bundleId: savedBundle.id,
          storageKey: r.storageKey,
          title: r.title ?? null,
          thumbnailKey: r.thumbnailKey ?? null,
          duration: r.duration ?? null,
          position: r.position ?? null,
        }),
      );
      savedReels = await this.reelRepo.save(reels);
    }

    this.logger.log(`Bundle "${savedBundle.title}" created in business ${businessId}`);
    return this.toBundleResponse(savedBundle, savedReels);
  }

  async findAllBundles(
    query: BundleQueryModel,
  ): Promise<{ data: BundleResponseModel[]; total: number }> {
    const businessId = this.businessContext.getBusinessId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.bundleRepo
      .createQueryBuilder('bundle')
      .where('bundle.business_id = :businessId', { businessId });

    if (query.search) {
      qb.andWhere('(bundle.title ILIKE :search OR bundle.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.status) {
      qb.andWhere('bundle.status = :status', { status: query.status });
    }

    qb.orderBy('bundle.createdAt', 'DESC').skip(skip).take(limit);

    const [bundles, total] = await qb.getManyAndCount();
    const data = await Promise.all(bundles.map((b) => this.toBundleResponse(b)));
    return { data, total };
  }

  async findOneBundle(id: string): Promise<BundleResponseModel> {
    const businessId = this.businessContext.getBusinessId();
    const bundle = await this.bundleRepo.findOne({
      where: { id, businessId },
      relations: ['reels'],
    });
    if (!bundle) {
      throw new NotFoundException(`Bundle ${id} not found`);
    }

    bundle.reels.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return this.toBundleResponse(bundle, bundle.reels);
  }

  async updateBundle(id: string, dto: UpdateBundleModel): Promise<BundleResponseModel> {
    const businessId = this.businessContext.getBusinessId();
    const bundle = await this.bundleRepo.findOneBy({ id, businessId });
    if (!bundle) {
      throw new NotFoundException(`Bundle ${id} not found`);
    }

    if (dto.title !== undefined) bundle.title = dto.title;
    if (dto.description !== undefined) bundle.description = dto.description;
    if (dto.categories !== undefined) bundle.categories = dto.categories;
    if (dto.thumbnailKey !== undefined) bundle.thumbnailKey = dto.thumbnailKey;

    if (dto.status !== undefined) {
      if (dto.status === BundleStatus.PUBLISHED && bundle.status !== BundleStatus.PUBLISHED) {
        bundle.publishedAt = new Date();
      }
      bundle.status = dto.status;
    }

    await this.bundleRepo.save(bundle);
    this.logger.log(`Bundle ${id} updated`);
    return this.toBundleResponse(bundle);
  }

  async removeBundle(id: string): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const bundle = await this.bundleRepo.findOneBy({ id, businessId });
    if (!bundle) {
      throw new NotFoundException(`Bundle ${id} not found`);
    }

    await this.bundleRepo.softDelete(id);
    this.logger.log(`Bundle ${id} soft-deleted`);
  }

  // ── Reel management ────────────────────────────────────────────────────────────

  async addReel(bundleId: string, dto: CreateReelModel): Promise<ReelResponseModel> {
    const businessId = this.businessContext.getBusinessId();
    const bundle = await this.bundleRepo.findOneBy({ id: bundleId, businessId });
    if (!bundle) {
      throw new NotFoundException(`Bundle ${bundleId} not found`);
    }

    const reel = this.reelRepo.create({
      bundleId,
      storageKey: dto.storageKey,
      title: dto.title ?? null,
      thumbnailKey: dto.thumbnailKey ?? null,
      duration: dto.duration ?? null,
      position: dto.position ?? null,
    });
    const savedReel = await this.reelRepo.save(reel);

    this.logger.log(`Reel added to bundle ${bundleId}`);
    return this.toReelResponse(savedReel);
  }

  async updateReel(
    bundleId: string,
    reelId: string,
    dto: UpdateReelModel,
  ): Promise<ReelResponseModel> {
    const businessId = this.businessContext.getBusinessId();
    const bundle = await this.bundleRepo.findOneBy({ id: bundleId, businessId });
    if (!bundle) {
      throw new NotFoundException(`Bundle ${bundleId} not found`);
    }

    const reel = await this.reelRepo.findOneBy({ id: reelId, bundleId });
    if (!reel) {
      throw new NotFoundException(`Reel ${reelId} not found in bundle ${bundleId}`);
    }

    if (dto.storageKey !== undefined) reel.storageKey = dto.storageKey;
    if (dto.title !== undefined) reel.title = dto.title;
    if (dto.thumbnailKey !== undefined) reel.thumbnailKey = dto.thumbnailKey;
    if (dto.duration !== undefined) reel.duration = dto.duration;
    if (dto.position !== undefined) reel.position = dto.position;

    await this.reelRepo.save(reel);
    this.logger.log(`Reel ${reelId} updated in bundle ${bundleId}`);
    return this.toReelResponse(reel);
  }

  async removeReel(bundleId: string, reelId: string): Promise<void> {
    const businessId = this.businessContext.getBusinessId();
    const bundle = await this.bundleRepo.findOneBy({ id: bundleId, businessId });
    if (!bundle) {
      throw new NotFoundException(`Bundle ${bundleId} not found`);
    }

    const reel = await this.reelRepo.findOneBy({ id: reelId, bundleId });
    if (!reel) {
      throw new NotFoundException(`Reel ${reelId} not found in bundle ${bundleId}`);
    }

    await this.reelRepo.delete(reelId);
    this.logger.log(`Reel ${reelId} removed from bundle ${bundleId}`);
  }

  // ── Mapping helpers ────────────────────────────────────────────────────────────

  private async resolveUrl(key: string | null): Promise<string | null> {
    if (!key) return null;
    return this.storageService.getSignedUrl({ key });
  }

  private async toBundleResponse(bundle: Bundle, reels?: Reel[]): Promise<BundleResponseModel> {
    const [thumbnailUrl, resolvedReels] = await Promise.all([
      this.resolveUrl(bundle.thumbnailKey),
      reels ? Promise.all(reels.map((r) => this.toReelResponse(r))) : undefined,
    ]);

    return {
      id: bundle.id,
      title: bundle.title,
      description: bundle.description,
      status: bundle.status,
      thumbnailUrl,
      publishedAt: bundle.publishedAt,
      categories: bundle.categories,
      reels: resolvedReels,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }

  private async toReelResponse(reel: Reel): Promise<ReelResponseModel> {
    const [url, thumbnailUrl] = await Promise.all([
      this.storageService.getSignedUrl({ key: reel.storageKey }),
      this.resolveUrl(reel.thumbnailKey),
    ]);

    return {
      id: reel.id,
      title: reel.title,
      url,
      thumbnailUrl,
      duration: reel.duration,
      position: reel.position,
      createdAt: reel.createdAt,
      updatedAt: reel.updatedAt,
    };
  }
}
