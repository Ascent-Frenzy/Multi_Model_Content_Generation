import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CHANNELS } from '@app/constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  async emitProgress(
    contentItemId: string,
    progress: number,
    stage: string,
  ): Promise<void> {
    await this.publish(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({ type: 'progress', contentItemId, progress, stage }),
    );
  }

  async emitComplete(
    contentItemId: string,
    renderedS3Key: string,
    thumbnailS3Key?: string,
  ): Promise<void> {
    await this.publish(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({
        type: 'complete',
        contentItemId,
        renderedS3Key,
        thumbnailS3Key,
      }),
    );
  }

  async emitFailed(contentItemId: string, error: string): Promise<void> {
    await this.publish(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({ type: 'failed', contentItemId, error }),
    );
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }
}
