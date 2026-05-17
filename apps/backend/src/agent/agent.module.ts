import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AgentService } from './agent.service';
import { AgentScheduler } from './agent.scheduler';
import { AgentProducer } from './agent.producer';
import { SOCIAL_QUEUE } from '@app/constants';

@Module({
  imports: [BullModule.registerQueue({ name: SOCIAL_QUEUE })],
  providers: [AgentService, AgentScheduler, AgentProducer],
  exports: [AgentService, AgentProducer],
})
export class AgentModule {}
