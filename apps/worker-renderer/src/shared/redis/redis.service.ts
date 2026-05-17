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
    userId: string,
    contentItemId: string,
    progress: number,
    stage: string,
  ): Promise<void> {
    await this.publish(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({ type: 'progress', userId, contentItemId, progress, stage }),
    );
  }

  async emitComplete(
    userId: string,
    contentItemId: string,
    renderedS3Key: string,
    thumbnailS3Key?: string,
  ): Promise<void> {
    await this.publish(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({ type: 'complete', userId, contentItemId, renderedS3Key, thumbnailS3Key }),
    );
  }

  async emitFailed(userId: string, contentItemId: string, error: string): Promise<void> {
    await this.publish(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({ type: 'failed', userId, contentItemId, error }),
    );
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }
}
