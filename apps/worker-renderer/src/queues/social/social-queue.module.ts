import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SOCIAL_QUEUE } from '@app/constants';
import { InstagramProcessor } from './instagram.processor';
import { S3Module } from '../../s3/s3.module';
import { InstagramModule } from '../../instagram/instagram.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: SOCIAL_QUEUE }),
    S3Module,
    InstagramModule,
  ],
  providers: [InstagramProcessor],
})
export class SocialQueueModule {}
