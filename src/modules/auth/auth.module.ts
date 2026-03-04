import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthProviderFactory } from './providers/auth-provider.factory';
import { AUTH_PROVIDER_TOKEN } from './providers/auth-provider.interface';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';

/**
 * Authentication module.
 *
 * Provides pluggable authentication via a factory pattern.
 * The AUTH_PROVIDER env var determines which provider is instantiated.
 *
 * Both APP_GUARD registrations live here so removing AuthModule
 * from app.module.ts disables auth entirely (plug-and-play).
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthProviderFactory,
    {
      provide: AUTH_PROVIDER_TOKEN,
      useFactory: async (factory: AuthProviderFactory) => {
        return factory.create();
      },
      inject: [AuthProviderFactory],
    },
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AUTH_PROVIDER_TOKEN, AuthService],
})
export class AuthModule {}
