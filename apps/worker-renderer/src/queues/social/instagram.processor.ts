import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import { createDecipheriv } from 'crypto';
import { SOCIAL_QUEUE, JOB_TYPE } from '@app/constants';
import { InstagramPostJob } from '@app/types';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { S3Service } from '../../s3/s3.service';
import { InstagramService } from '../../instagram/instagram.service';

// lockDuration must exceed the 5-min Instagram container poll window or
// BullMQ marks the job stalled and re-queues it mid-publish.
@Processor(SOCIAL_QUEUE, { lockDuration: 360000 })
export class InstagramProcessor extends WorkerHost {
  private readonly logger = new Logger(InstagramProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly instagram: InstagramService,
  ) {
    super();
  }

  async process(job: Job<InstagramPostJob>): Promise<void> {
    if (job.name !== JOB_TYPE.INSTAGRAM_POST) {
      throw new Error(`Unknown social job type: ${job.name}`);
    }

    const {
      scheduledPostId,
      contentItemId,
      renderedS3Key,
      caption,
      igUserId,
      encryptedAccessToken,
    } = job.data;

    const accessToken = this.decryptToken(encryptedAccessToken);

    const tmpDir = `/tmp/${contentItemId}`;
    await fs.mkdir(tmpDir, { recursive: true });

    try {
      await this.prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: { status: 'posting' },
      });

      // Use presigned URL — Instagram fetches the asset directly from S3.
      // No local download needed.
      const ext = renderedS3Key.endsWith('.mp4') ? 'mp4' : 'jpg';
      const mediaUrl = await this.s3.getPresignedUrl(renderedS3Key, 3600);
      const mediaType: 'VIDEO' | 'IMAGE' = ext === 'mp4' ? 'VIDEO' : 'IMAGE';

      const igId = await this.instagram.publish({
        igUserId,
        accessToken,
        mediaUrl,
        caption,
        mediaType,
      });

      await this.prisma.scheduledPost.update({
        where: { id: scheduledPostId },
        data: { status: 'posted', instagramPostId: igId, postedAt: new Date() },
      });
      await this.prisma.contentItem.update({
        where: { id: contentItemId },
        data: { status: 'published' },
      });
    } catch (error) {
      const isLastAttempt =
        job.attemptsMade >= (job.opts.attempts || 3) - 1;
      if (isLastAttempt) {
        try {
          await this.prisma.scheduledPost.update({
            where: { id: scheduledPostId },
            data: { status: 'failed' },
          });
        } catch (cleanupError) {
          this.logger.error(
            `Failed to update ScheduledPost status: ${(cleanupError as Error).message}`,
          );
        }
      }
      throw error;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Instagram post job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Instagram post job ${job.id} completed`);
  }

  private decryptToken(ciphertext: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error('ENCRYPTION_KEY is not set');
    const [ivHex, encrypted] = ciphertext.split(':');
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
