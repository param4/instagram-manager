import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { AuthProviderInterface } from './auth-provider.interface';
import { AuthProvider } from '../types/auth.type';

/**
 * Factory that creates the correct AuthProvider implementation
 * based on the AUTH_PROVIDER environment variable.
 *
 * Only the selected provider's dependencies are imported at runtime,
 * so provider-specific packages only need to be installed when that
 * provider is in use.
 */
@Injectable()
export class AuthProviderFactory {
  private readonly logger = new Logger(AuthProviderFactory.name);

  constructor(private readonly configService: ConfigService) {}

  async create(): Promise<AuthProviderInterface> {
    const provider = this.configService.authProvider as AuthProvider;
    this.logger.log(`Initializing auth provider: ${provider}`);

    switch (provider) {
      case AuthProvider.AUTH0: {
        const { Auth0Provider } = await import('./auth0.provider');
        return new Auth0Provider(this.configService);
      }
      case AuthProvider.CLERK: {
        const { ClerkProvider } = await import('./clerk.provider');
        return new ClerkProvider(this.configService);
      }
      case AuthProvider.WORKOS: {
        const { WorkOSProvider } = await import('./workos.provider');
        return new WorkOSProvider(this.configService);
      }
      case AuthProvider.STYTCH: {
        const { StytchProvider } = await import('./stytch.provider');
        return new StytchProvider(this.configService);
      }
      case AuthProvider.ZITADEL: {
        const { ZitadelProvider } = await import('./zitadel.provider');
        return new ZitadelProvider(this.configService);
      }
      default:
        throw new Error(`Unsupported auth provider: ${String(provider)}`);
    }
  }
}
