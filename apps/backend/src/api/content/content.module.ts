import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { S3Module } from '../../shared/s3/s3.module';
import { RENDER_QUEUE } from '@app/constants';

@Module({
  imports: [BullModule.registerQueue({ name: RENDER_QUEUE }), S3Module],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
