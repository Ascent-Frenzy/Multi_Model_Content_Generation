import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentScheduler } from './agent.scheduler';

@Module({
  providers: [AgentService, AgentScheduler],
  exports: [AgentService],
})
export class AgentModule {}
