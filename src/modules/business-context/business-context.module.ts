import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BusinessContextService } from './services/business-context.service';
import { BusinessContextGuard } from './guards/business-context.guard';
import { BusinessContextMiddleware } from './middleware/business-context.middleware';

/**
 * Provides request-scoped business isolation via AsyncLocalStorage.
 *
 * Uses a middleware to wrap each request in AsyncLocalStorage.run(),
 * ensuring the async context is preserved across all NestJS lifecycle
 * stages. The BusinessContextGuard then populates the store with actual
 * business data after AuthGuard has verified the token.
 *
 * Must be imported AFTER AuthModule in app.module so that
 * BusinessContextGuard runs after AuthGuard in the guard chain.
 */
@Global()
@Module({
  providers: [
    BusinessContextService,
    {
      provide: APP_GUARD,
      useClass: BusinessContextGuard,
    },
  ],
  exports: [BusinessContextService],
})
export class BusinessContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(BusinessContextMiddleware).forRoutes('*');
  }
}
