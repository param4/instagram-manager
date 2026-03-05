import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get appName(): string {
    return this.configService.get<string>('APP_NAME', 'insta-uploader');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get dbHost(): string {
    return this.configService.get<string>('DB_HOST', 'localhost');
  }

  get dbPort(): number {
    return this.configService.get<number>('DB_PORT', 5432);
  }

  get dbUsername(): string {
    return this.configService.get<string>('DB_USERNAME', 'postgres');
  }

  get dbPassword(): string {
    return this.configService.get<string>('DB_PASSWORD', 'postgres');
  }

  get dbName(): string {
    return this.configService.get<string>('DB_NAME', 'insta_uploader');
  }

  get igAppId(): string {
    return this.configService.get<string>('IG_APP_ID', '');
  }

  get igAppSecret(): string {
    return this.configService.get<string>('IG_APP_SECRET', '');
  }

  get igRedirectUri(): string {
    return this.configService.get<string>('IG_REDIRECT_URI', '');
  }

  get igApiVersion(): string {
    return this.configService.get<string>('IG_API_VERSION', 'v25.0');
  }

  get igPollingIntervalMs(): number {
    return this.configService.get<number>('IG_POLLING_INTERVAL_MS', 2000);
  }

  get igMaxPollingAttempts(): number {
    return this.configService.get<number>('IG_MAX_POLLING_ATTEMPTS', 30);
  }

  // ── YouTube ──────────────────────────────────────────────────────────

  get ytClientId(): string {
    return this.configService.get<string>('YT_CLIENT_ID', '');
  }

  get ytClientSecret(): string {
    return this.configService.get<string>('YT_CLIENT_SECRET', '');
  }

  get ytRedirectUri(): string {
    return this.configService.get<string>('YT_REDIRECT_URI', '');
  }

  // ── Auth ─────────────────────────────────────────────────────────────

  get authProvider(): string {
    return this.configService.get<string>('AUTH_PROVIDER', '');
  }

  get authRequireMfa(): boolean {
    return this.configService.get<string>('AUTH_REQUIRE_MFA', 'false') === 'true';
  }

  // Auth0
  get auth0Domain(): string {
    return this.configService.get<string>('AUTH0_DOMAIN', '');
  }

  get auth0Audience(): string {
    return this.configService.get<string>('AUTH0_AUDIENCE', '');
  }

  get auth0Namespace(): string {
    return this.configService.get<string>('AUTH0_NAMESPACE', '') || `https://${this.auth0Domain}`;
  }

  // Clerk
  get clerkSecretKey(): string {
    return this.configService.get<string>('CLERK_SECRET_KEY', '');
  }

  get clerkPublishableKey(): string {
    return this.configService.get<string>('CLERK_PUBLISHABLE_KEY', '');
  }

  // WorkOS
  get workosApiKey(): string {
    return this.configService.get<string>('WORKOS_API_KEY', '');
  }

  get workosClientId(): string {
    return this.configService.get<string>('WORKOS_CLIENT_ID', '');
  }

  // Stytch
  get stytchProjectId(): string {
    return this.configService.get<string>('STYTCH_PROJECT_ID', '');
  }

  get stytchSecret(): string {
    return this.configService.get<string>('STYTCH_SECRET', '');
  }

  // Zitadel
  get zitadelDomain(): string {
    return this.configService.get<string>('ZITADEL_DOMAIN', '');
  }

  get zitadelProjectId(): string {
    return this.configService.get<string>('ZITADEL_PROJECT_ID', '');
  }
}
