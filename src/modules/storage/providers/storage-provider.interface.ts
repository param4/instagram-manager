import {
  UploadParams,
  UploadResult,
  SignedUrlParams,
  SignedUploadUrlParams,
  SignedUploadUrlResult,
} from '../types/storage.type';

export interface StorageProviderInterface {
  upload(params: UploadParams): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  getSignedUrl(params: SignedUrlParams): Promise<string>;
  getSignedUploadUrl(params: SignedUploadUrlParams): Promise<SignedUploadUrlResult>;
}

export const STORAGE_PROVIDER_TOKEN = Symbol('STORAGE_PROVIDER_TOKEN');
