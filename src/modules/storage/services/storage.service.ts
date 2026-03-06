import { Inject, Injectable } from '@nestjs/common';
import {
  StorageProviderInterface,
  STORAGE_PROVIDER_TOKEN,
} from '../providers/storage-provider.interface';
import {
  UploadParams,
  UploadResult,
  SignedUrlParams,
  SignedUploadUrlParams,
  SignedUploadUrlResult,
} from '../types/storage.type';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: StorageProviderInterface,
  ) {}

  async upload(params: UploadParams): Promise<UploadResult> {
    return this.storageProvider.upload(params);
  }

  async delete(key: string): Promise<void> {
    return this.storageProvider.delete(key);
  }

  async getSignedUrl(params: SignedUrlParams): Promise<string> {
    return this.storageProvider.getSignedUrl(params);
  }

  async getSignedUploadUrl(params: SignedUploadUrlParams): Promise<SignedUploadUrlResult> {
    return this.storageProvider.getSignedUploadUrl(params);
  }
}
