import { Injectable } from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || 'mmcg-assets';

    const credentials =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined;

    this.s3Client = new S3Client({
      region: this.region,
      ...(credentials && { credentials }),
    });
  }

  async download(s3Key: string, localPath: string): Promise<void> {
    await mkdir(dirname(localPath), { recursive: true });

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`S3 object body is empty for key: ${s3Key}`);
    }

    const body = response.Body as Readable;

    return new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(localPath);
      body.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      body.on('error', reject);
    });
  }

  async upload(
    localPath: string,
    s3Key: string,
    contentType: string,
  ): Promise<void> {
    const fileStream = createReadStream(localPath);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: fileStream,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
  }

  getObjectUrl(s3Key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }

  async getPresignedUrl(
    s3Key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
