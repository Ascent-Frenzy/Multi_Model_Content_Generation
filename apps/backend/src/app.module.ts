import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { S3Module } from './shared/s3/s3.module';
import { ApiModule } from './api/api.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [
    // Config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // BullMQ — connects to Redis for job queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.getOrThrow<string>('REDIS_URL'));
        return {
          connection: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port || '6379', 10),
          },
        };
      },
      inject: [ConfigService],
    }),

    // NestJS Schedule — enables @Cron decorators
    ScheduleModule.forRoot(),

    // Shared infrastructure modules
    PrismaModule,
    RedisModule,
    S3Module,

    // Application modules
    ApiModule,
    AgentModule,
  ],
})
export class AppModule {}
