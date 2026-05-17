import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RENDER_QUEUE, JOB_TYPE } from '@app/constants';
import { CarouselHandler } from './carousel-handler';
import { ReelHandler } from './reel-handler';

@Processor(RENDER_QUEUE, { concurrency: 1 })
export class RenderProcessor extends WorkerHost {
  private readonly logger = new Logger(RenderProcessor.name);

  constructor(
    private readonly carouselHandler: CarouselHandler,
    private readonly reelHandler: ReelHandler,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_TYPE.CAROUSEL_RENDER:
        return this.carouselHandler.handle(job);
      case JOB_TYPE.REEL_RENDER:
        return this.reelHandler.handle(job);
      default:
        throw new Error(`Unknown render job type: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }
}
