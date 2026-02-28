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
}
