import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { SOCIAL_QUEUE } from '@app/constants';

@Module({
  imports: [BullModule.registerQueue({ name: SOCIAL_QUEUE })],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
