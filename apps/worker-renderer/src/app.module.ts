import { Module, Controller, Get } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { S3Module } from './s3/s3.module';
import { FfmpegModule } from './ffmpeg/ffmpeg.module';
import { FluxModule } from './flux/flux.module';
import { ElevenLabsModule } from './elevenlabs/elevenlabs.module';
import { InstagramModule } from './instagram/instagram.module';
import { RenderQueueModule } from './queues/render/render-queue.module';
import { SocialQueueModule } from './queues/social/social-queue.module';

const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'worker-renderer' };
  }
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port) || 6379,
        password: redisUrl.password || undefined,
      },
    }),
    PrismaModule,
    RedisModule,
    S3Module,
    FfmpegModule,
    FluxModule,
    ElevenLabsModule,
    InstagramModule,
    RenderQueueModule,
    SocialQueueModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
