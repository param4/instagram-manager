import { Module, Global } from '@nestjs/common';
import { StorageProviderFactory } from './providers/storage-provider.factory';
import { STORAGE_PROVIDER_TOKEN } from './providers/storage-provider.interface';
import { StorageService } from './services/storage.service';

@Global()
@Module({
  providers: [
    StorageProviderFactory,
    {
      provide: STORAGE_PROVIDER_TOKEN,
      useFactory: async (factory: StorageProviderFactory) => {
        return factory.create();
      },
      inject: [StorageProviderFactory],
    },
    StorageService,
  ],
  exports: [STORAGE_PROVIDER_TOKEN, StorageService],
})
export class StorageModule {}
