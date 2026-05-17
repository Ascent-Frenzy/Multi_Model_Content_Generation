import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { RENDER_QUEUE } from '@app/constants';

@Module({
  imports: [BullModule.registerQueue({ name: RENDER_QUEUE })],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
