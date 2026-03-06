import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, ValidateIf, validateSync } from 'class-validator';

enum AuthProviderEnum {
  AUTH0 = 'auth0',
  CLERK = 'clerk',
  WORKOS = 'workos',
  STYTCH = 'stytch',
  ZITADEL = 'zitadel',
}

enum StorageProviderEnum {
  R2 = 'r2',
  S3 = 's3',
}

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 3000;

  @IsString()
  APP_NAME: string = 'insta-uploader';

  @IsString()
  DB_HOST: string = 'localhost';

  @IsNumber()
  DB_PORT: number = 5432;

  @IsString()
  DB_USERNAME: string = 'postgres';

  @IsString()
  DB_PASSWORD: string = 'postgres';

  @IsString()
  DB_NAME: string = 'insta_uploader';

  @IsString()
  IG_APP_ID: string;

  @IsString()
  IG_APP_SECRET: string;

  @IsString()
  IG_REDIRECT_URI: string;

  @IsString()
  @IsOptional()
  IG_API_VERSION: string = 'v25.0';

  @IsNumber()
  @IsOptional()
  IG_POLLING_INTERVAL_MS: number = 2000;

  @IsNumber()
  @IsOptional()
  IG_MAX_POLLING_ATTEMPTS: number = 30;

  // ── YouTube ─────────────────────────────────────────────────────────

  @IsString()
  YT_CLIENT_ID: string;

  @IsString()
  YT_CLIENT_SECRET: string;

  @IsString()
  YT_REDIRECT_URI: string;

  // ── Auth ─────────────────────────────────────────────────────────────

  @IsEnum(AuthProviderEnum)
  AUTH_PROVIDER: AuthProviderEnum;

  @IsString()
  @IsOptional()
  AUTH_REQUIRE_MFA: string = 'false';

  // Auth0
  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.AUTH0)
  @IsString()
  AUTH0_DOMAIN: string;

  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.AUTH0)
  @IsString()
  AUTH0_AUDIENCE: string;

  @IsString()
  @IsOptional()
  AUTH0_NAMESPACE: string = '';

  // Clerk
  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.CLERK)
  @IsString()
  CLERK_SECRET_KEY: string;

  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.CLERK)
  @IsString()
  CLERK_PUBLISHABLE_KEY: string;

  // WorkOS
  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.WORKOS)
  @IsString()
  WORKOS_API_KEY: string;

  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.WORKOS)
  @IsString()
  WORKOS_CLIENT_ID: string;

  // Stytch
  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.STYTCH)
  @IsString()
  STYTCH_PROJECT_ID: string;

  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.STYTCH)
  @IsString()
  STYTCH_SECRET: string;

  // Zitadel
  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.ZITADEL)
  @IsString()
  ZITADEL_DOMAIN: string;

  @ValidateIf((o: EnvironmentVariables) => o.AUTH_PROVIDER === AuthProviderEnum.ZITADEL)
  @IsString()
  ZITADEL_PROJECT_ID: string;

  // ── Storage ─────────────────────────────────────────────────────────

  @IsEnum(StorageProviderEnum)
  @IsOptional()
  STORAGE_PROVIDER: StorageProviderEnum;

  // Cloudflare R2
  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === StorageProviderEnum.R2)
  @IsString()
  R2_ACCOUNT_ID: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === StorageProviderEnum.R2)
  @IsString()
  R2_ACCESS_KEY_ID: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === StorageProviderEnum.R2)
  @IsString()
  R2_SECRET_ACCESS_KEY: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === StorageProviderEnum.R2)
  @IsString()
  R2_BUCKET_NAME: string;

  @IsString()
  @IsOptional()
  R2_PUBLIC_URL: string = '';

  // AWS S3
  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === StorageProviderEnum.S3)
  @IsString()
  S3_REGION: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === StorageProviderEnum.S3)
  @IsString()
  S3_ACCESS_KEY_ID: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === StorageProviderEnum.S3)
  @IsString()
  S3_SECRET_ACCESS_KEY: string;

  @ValidateIf((o: EnvironmentVariables) => o.STORAGE_PROVIDER === StorageProviderEnum.S3)
  @IsString()
  S3_BUCKET_NAME: string;

  @IsString()
  @IsOptional()
  S3_PUBLIC_URL: string = '';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
