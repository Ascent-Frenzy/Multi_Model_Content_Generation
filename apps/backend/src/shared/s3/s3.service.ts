import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
  }

  /**
   * Generate a presigned PUT URL for direct client upload.
   * Returns the presigned URL and the S3 key where the file will be stored.
   */
  async getPresignedUploadUrl(
    prefix: string,
    mimeType: string,
    extension: string,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    const s3Key = `${prefix}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: mimeType,
    });

    const presignedUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 3600,
    });

    return { presignedUrl, s3Key };
  }

  /** Delete an object from S3 */
  async deleteObject(s3Key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
    );
  }
}
