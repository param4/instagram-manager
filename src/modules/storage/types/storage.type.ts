import { Readable } from 'stream';

export enum StorageProvider {
  R2 = 'r2',
  S3 = 's3',
}

export type UploadParams = {
  /** Object key (path) in the bucket, e.g. "uploads/abc123.jpg" */
  key: string;
  /** File body as Buffer or Readable stream */
  body: Buffer | Readable;
  /** MIME type, e.g. "image/jpeg" */
  contentType: string;
  /** Optional metadata to store alongside the object */
  metadata?: Record<string, string>;
};

export type UploadResult = {
  /** The key under which the object was stored */
  key: string;
  /** Public URL if the bucket is public, otherwise null */
  url: string | null;
};

export type SignedUrlParams = {
  key: string;
  /** Expiry in seconds (default: 3600) */
  expiresIn?: number;
};

export type SignedUploadUrlParams = {
  key: string;
  contentType: string;
  /** Expiry in seconds (default: 3600) */
  expiresIn?: number;
};

export type SignedUploadUrlResult = {
  url: string;
  key: string;
  expiresIn: number;
};
