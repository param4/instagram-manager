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

enum EmailProviderEnum {
  SENDGRID = 'sendgrid',
  SES = 'ses',
  SMTP = 'smtp',
}

enum SmsProviderEnum {
  TWILIO = 'twilio',
  SNS = 'sns',
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

  // ── Email ─────────────────────────────────────────────────────────

  @IsEnum(EmailProviderEnum)
  @IsOptional()
  EMAIL_PROVIDER: EmailProviderEnum;

  @ValidateIf((o: EnvironmentVariables) => !!o.EMAIL_PROVIDER)
  @IsString()
  EMAIL_FROM: string;

  // SendGrid
  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === EmailProviderEnum.SENDGRID)
  @IsString()
  SENDGRID_API_KEY: string;

  // AWS SES
  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === EmailProviderEnum.SES)
  @IsString()
  SES_REGION: string;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === EmailProviderEnum.SES)
  @IsString()
  SES_ACCESS_KEY_ID: string;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === EmailProviderEnum.SES)
  @IsString()
  SES_SECRET_ACCESS_KEY: string;

  // SMTP
  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === EmailProviderEnum.SMTP)
  @IsString()
  SMTP_HOST: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT: number = 587;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === EmailProviderEnum.SMTP)
  @IsString()
  SMTP_USER: string;

  @ValidateIf((o: EnvironmentVariables) => o.EMAIL_PROVIDER === EmailProviderEnum.SMTP)
  @IsString()
  SMTP_PASS: string;

  @IsString()
  @IsOptional()
  SMTP_SECURE: string = 'false';

  // ── SMS ───────────────────────────────────────────────────────────

  @IsEnum(SmsProviderEnum)
  @IsOptional()
  SMS_PROVIDER: SmsProviderEnum;

  @ValidateIf((o: EnvironmentVariables) => !!o.SMS_PROVIDER)
  @IsString()
  SMS_FROM: string;

  // Twilio
  @ValidateIf((o: EnvironmentVariables) => o.SMS_PROVIDER === SmsProviderEnum.TWILIO)
  @IsString()
  TWILIO_ACCOUNT_SID: string;

  @ValidateIf((o: EnvironmentVariables) => o.SMS_PROVIDER === SmsProviderEnum.TWILIO)
  @IsString()
  TWILIO_AUTH_TOKEN: string;

  // AWS SNS
  @ValidateIf((o: EnvironmentVariables) => o.SMS_PROVIDER === SmsProviderEnum.SNS)
  @IsString()
  SNS_REGION: string;

  @ValidateIf((o: EnvironmentVariables) => o.SMS_PROVIDER === SmsProviderEnum.SNS)
  @IsString()
  SNS_ACCESS_KEY_ID: string;

  @ValidateIf((o: EnvironmentVariables) => o.SMS_PROVIDER === SmsProviderEnum.SNS)
  @IsString()
  SNS_SECRET_ACCESS_KEY: string;
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
