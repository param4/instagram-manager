import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

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
