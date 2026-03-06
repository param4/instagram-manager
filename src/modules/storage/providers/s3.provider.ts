import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { StorageProviderInterface } from './storage-provider.interface';
import {
  UploadParams,
  UploadResult,
  SignedUrlParams,
  SignedUploadUrlParams,
  SignedUploadUrlResult,
} from '../types/storage.type';

type S3Client = import('@aws-sdk/client-s3').S3Client;
type GetSignedUrlFn = typeof import('@aws-sdk/s3-request-presigner').getSignedUrl;

const DEFAULT_EXPIRY = 3600;

@Injectable()
export class S3Provider implements StorageProviderInterface {
  private readonly logger = new Logger(S3Provider.name);
  private client: S3Client | null = null;
  private signUrl: GetSignedUrlFn | null = null;

  constructor(private readonly configService: ConfigService) {}

  async upload(params: UploadParams): Promise<UploadResult> {
    const { client, PutObjectCommand } = await this.ensureInitialized();

    await client.send(
      new PutObjectCommand({
        Bucket: this.configService.s3BucketName,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        Metadata: params.metadata,
      }),
    );

    this.logger.debug(`Uploaded: ${params.key}`);

    const publicUrl = this.configService.s3PublicUrl;
    return {
      key: params.key,
      url: publicUrl ? `${publicUrl}/${params.key}` : null,
    };
  }

  async delete(key: string): Promise<void> {
    const { client, DeleteObjectCommand } = await this.ensureInitialized();

    await client.send(
      new DeleteObjectCommand({
        Bucket: this.configService.s3BucketName,
        Key: key,
      }),
    );

    this.logger.debug(`Deleted: ${key}`);
  }

  async getSignedUrl(params: SignedUrlParams): Promise<string> {
    const { client, GetObjectCommand } = await this.ensureInitialized();
    const signUrl = this.signUrl!;
    const expiresIn = params.expiresIn ?? DEFAULT_EXPIRY;

    return signUrl(
      client,
      new GetObjectCommand({
        Bucket: this.configService.s3BucketName,
        Key: params.key,
      }),
      { expiresIn },
    );
  }

  async getSignedUploadUrl(params: SignedUploadUrlParams): Promise<SignedUploadUrlResult> {
    const { client, PutObjectCommand } = await this.ensureInitialized();
    const signUrl = this.signUrl!;
    const expiresIn = params.expiresIn ?? DEFAULT_EXPIRY;

    const url = await signUrl(
      client,
      new PutObjectCommand({
        Bucket: this.configService.s3BucketName,
        Key: params.key,
        ContentType: params.contentType,
      }),
      { expiresIn },
    );

    return { url, key: params.key, expiresIn };
  }

  private async ensureInitialized() {
    if (this.client) {
      const s3 = await import('@aws-sdk/client-s3');
      return {
        client: this.client,
        PutObjectCommand: s3.PutObjectCommand,
        GetObjectCommand: s3.GetObjectCommand,
        DeleteObjectCommand: s3.DeleteObjectCommand,
      };
    }

    try {
      const s3 = await import('@aws-sdk/client-s3');
      const presigner = await import('@aws-sdk/s3-request-presigner');

      this.client = new s3.S3Client({
        region: this.configService.s3Region,
        credentials: {
          accessKeyId: this.configService.s3AccessKeyId,
          secretAccessKey: this.configService.s3SecretAccessKey,
        },
      });
      this.signUrl = presigner.getSignedUrl;

      this.logger.log('S3 storage provider initialized');

      return {
        client: this.client,
        PutObjectCommand: s3.PutObjectCommand,
        GetObjectCommand: s3.GetObjectCommand,
        DeleteObjectCommand: s3.DeleteObjectCommand,
      };
    } catch {
      throw new Error(
        'S3 provider requires "@aws-sdk/client-s3" and "@aws-sdk/s3-request-presigner". ' +
          'Run: pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner',
      );
    }
  }
}
