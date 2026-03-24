import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BusinessContextService } from '../services/business-context.service';

/**
 * Middleware that wraps the entire request in an AsyncLocalStorage.run() context.
 *
 * This ensures the async context is preserved across all NestJS lifecycle stages
 * (guards, interceptors, pipes, controllers, services). The guard later populates
 * the store with actual data via enterWith().
 *
 * Must be applied BEFORE any guards in the NestJS lifecycle.
 */
@Injectable()
export class BusinessContextMiddleware implements NestMiddleware {
  constructor(private readonly businessContextService: BusinessContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Start with an empty store; the guard will populate it later
    this.businessContextService.run({ businessId: null, userId: '', isSuperAdmin: false }, () =>
      next(),
    );
  }
}
