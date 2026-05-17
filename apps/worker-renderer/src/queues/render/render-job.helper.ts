import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { JOB_TYPE } from '@app/constants';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';

type JobType = (typeof JOB_TYPE)[keyof typeof JOB_TYPE];

/**
 * Wraps the boilerplate that every render handler repeats:
 *   - create + clean up a tmp directory
 *   - emit progress / complete / failed events (Redis + DB)
 *   - mark ContentItem ready or failed
 */
export class RenderJobHelper {
  private readonly logger = new Logger(RenderJobHelper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly contentItemId: string,
    private readonly jobType: JobType,
  ) {}

  get tmpDir(): string {
    return `/tmp/${this.contentItemId}`;
  }

  /** Emit a progress event over Redis and persist the percentage. */
  async progress(percent: number, stage: string): Promise<void> {
    await this.redis.emitProgress(this.contentItemId, percent, stage);
    await this.prisma.renderJob.updateMany({
      where: { contentItemId: this.contentItemId, jobType: this.jobType },
      data: { ...(percent === 5 ? { status: 'processing' } : {}), progress: percent },
    });
  }

  /** Mark the render as successfully completed. */
  async complete(renderedS3Key: string, thumbnailS3Key: string): Promise<void> {
    await this.redis.emitComplete(this.contentItemId, renderedS3Key, thumbnailS3Key);

    await this.prisma.contentItem.update({
      where: { id: this.contentItemId },
      data: { renderedS3Key, thumbnailS3Key, status: 'ready' },
    });

    await this.prisma.renderJob.updateMany({
      where: { contentItemId: this.contentItemId, jobType: this.jobType },
      data: { status: 'completed', progress: 100, completedAt: new Date() },
    });
  }

  /** Mark the render as failed (best-effort — swallows cleanup errors). */
  async fail(error: Error): Promise<void> {
    try {
      await this.redis.emitFailed(this.contentItemId, error.message);
      await this.prisma.renderJob.updateMany({
        where: { contentItemId: this.contentItemId, jobType: this.jobType },
        data: { status: 'failed', error: error.message },
      });
      await this.prisma.contentItem.update({
        where: { id: this.contentItemId },
        data: { status: 'failed' },
      });
    } catch (cleanupError) {
      this.logger.error(
        `Cleanup failed for ${this.contentItemId}: ${(cleanupError as Error).message}`,
      );
    }
  }

  /**
   * Run `fn` inside a managed tmp directory with automatic cleanup and
   * error handling.  Re-throws the original error after calling `fail()`.
   */
  async run(fn: () => Promise<void>): Promise<void> {
    await fs.mkdir(this.tmpDir, { recursive: true });
    try {
      await fn();
    } catch (error) {
      await this.fail(error as Error);
      throw error;
    } finally {
      await fs.rm(this.tmpDir, { recursive: true, force: true });
    }
  }
}
