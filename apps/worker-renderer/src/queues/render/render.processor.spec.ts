import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { RenderProcessor } from './render.processor';
import { CarouselHandler } from './carousel-handler';
import { ReelHandler } from './reel-handler';
import { JOB_TYPE } from '@app/constants';

describe('RenderProcessor', () => {
  let processor: RenderProcessor;
  let carouselHandler: jest.Mocked<CarouselHandler>;
  let reelHandler: jest.Mocked<ReelHandler>;

  beforeEach(async () => {
    const mockCarouselHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    };
    const mockReelHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RenderProcessor,
        { provide: CarouselHandler, useValue: mockCarouselHandler },
        { provide: ReelHandler, useValue: mockReelHandler },
      ],
    }).compile();

    processor = module.get<RenderProcessor>(RenderProcessor);
    carouselHandler = module.get(CarouselHandler);
    reelHandler = module.get(ReelHandler);
  });

  function createMockJob(name: string, data: Record<string, unknown> = {}): Job {
    return {
      id: 'test-job-id',
      name,
      data,
    } as unknown as Job;
  }

  it('should dispatch carousel_render job to CarouselHandler', async () => {
    const job = createMockJob(JOB_TYPE.CAROUSEL_RENDER, {
      contentItemId: 'test-id',
    });

    await processor.process(job);

    expect(carouselHandler.handle).toHaveBeenCalledWith(job);
    expect(reelHandler.handle).not.toHaveBeenCalled();
  });

  it('should dispatch reel_render job to ReelHandler', async () => {
    const job = createMockJob(JOB_TYPE.REEL_RENDER, {
      contentItemId: 'test-id',
    });

    await processor.process(job);

    expect(reelHandler.handle).toHaveBeenCalledWith(job);
    expect(carouselHandler.handle).not.toHaveBeenCalled();
  });

  it('should throw Error for unknown job name', async () => {
    const job = createMockJob('unknown_job_type');

    await expect(processor.process(job)).rejects.toThrow(
      'Unknown render job type: unknown_job_type',
    );

    expect(carouselHandler.handle).not.toHaveBeenCalled();
    expect(reelHandler.handle).not.toHaveBeenCalled();
  });

  it('should log on failed event', () => {
    const job = createMockJob('test') as Job;
    const error = new Error('Something broke');

    // Should not throw — just logs
    expect(() => processor.onFailed(job, error)).not.toThrow();
  });

  it('should log on completed event', () => {
    const job = createMockJob('test') as Job;

    // Should not throw — just logs
    expect(() => processor.onCompleted(job)).not.toThrow();
  });
});
