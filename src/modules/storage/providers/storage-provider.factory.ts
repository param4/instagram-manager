import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { StorageProviderInterface } from './storage-provider.interface';
import { StorageProvider } from '../types/storage.type';

@Injectable()
export class StorageProviderFactory {
  private readonly logger = new Logger(StorageProviderFactory.name);

  constructor(private readonly configService: ConfigService) {}

  async create(): Promise<StorageProviderInterface> {
    const provider = this.configService.storageProvider as StorageProvider;
    this.logger.log(`Initializing storage provider: ${provider}`);

    switch (provider) {
      case StorageProvider.R2: {
        const { R2Provider } = await import('./r2.provider');
        return new R2Provider(this.configService);
      }
      case StorageProvider.S3: {
        const { S3Provider } = await import('./s3.provider');
        return new S3Provider(this.configService);
      }
      default:
        throw new Error(`Unsupported storage provider: ${String(provider)}`);
    }
  }
}
