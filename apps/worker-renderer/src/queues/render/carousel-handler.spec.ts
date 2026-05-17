import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import { CarouselHandler } from './carousel-handler';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { S3Service } from '../../s3/s3.service';
import { CarouselEncoder } from '../../ffmpeg/carousel-encoder';
import { CarouselRenderJob } from '@app/types';
import { JOB_TYPE } from '@app/constants';

// Mock sharp
jest.mock('sharp', () => {
  const mockSharpInstance = {
    resize: jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
  };
  const sharpFn = jest.fn().mockReturnValue(mockSharpInstance);
  return { __esModule: true, default: sharpFn };
});

// Mock fs
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: jest.fn().mockResolvedValue(undefined),
      rm: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('CarouselHandler', () => {
  let handler: CarouselHandler;
  let prisma: Record<string, any>;
  let redis: jest.Mocked<RedisService>;
  let s3: jest.Mocked<S3Service>;
  let carouselEncoder: jest.Mocked<CarouselEncoder>;

  const mockJobData: CarouselRenderJob = {
    jobType: 'carousel_render',
    userId: 'test-user-id',
    contentItemId: 'test-content-id',
    brandProfileId: 'brand-1',
    slides: [
      {
        order: 0,
        headline: 'Slide 1',
        body: 'Body text 1',
        bgColor: '#FF0000',
        bgImageS3Key: 'assets/bg-0.png',
        overlayImageS3Key: 'assets/overlay-0.png',
        textColor: '#FFFFFF',
      },
      {
        order: 1,
        headline: 'Slide 2',
        body: 'Body text 2',
        bgColor: '#00FF00',
        textColor: '#000000',
      },
    ],
    outputFormat: 'mp4',
    dimensions: { width: 1080, height: 1080 },
  };

  function createMockJob(
    data: CarouselRenderJob = mockJobData,
  ): Job<CarouselRenderJob> {
    return {
      id: 'job-1',
      name: JOB_TYPE.CAROUSEL_RENDER,
      data,
    } as unknown as Job<CarouselRenderJob>;
  }

  beforeEach(async () => {
    prisma = {
      renderJob: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      contentItem: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const mockRedis = {
      emitProgress: jest.fn().mockResolvedValue(undefined),
      emitComplete: jest.fn().mockResolvedValue(undefined),
      emitFailed: jest.fn().mockResolvedValue(undefined),
    };

    const mockS3 = {
      download: jest.fn().mockResolvedValue(undefined),
      upload: jest.fn().mockResolvedValue(undefined),
    };

    const mockEncoder = {
      encode: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarouselHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: S3Service, useValue: mockS3 },
        { provide: CarouselEncoder, useValue: mockEncoder },
      ],
    }).compile();

    handler = module.get<CarouselHandler>(CarouselHandler);
    redis = module.get(RedisService);
    s3 = module.get(S3Service);
    carouselEncoder = module.get(CarouselEncoder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should emit progress events at 5, 20, 40, 90 and complete', async () => {
    const job = createMockJob();

    await handler.handle(job);

    expect(redis.emitProgress).toHaveBeenCalledWith(
      'test-user-id',
      'test-content-id',
      5,
      'Job started',
    );
    expect(redis.emitProgress).toHaveBeenCalledWith(
      'test-user-id',
      'test-content-id',
      20,
      'Assets downloaded',
    );
    expect(redis.emitProgress).toHaveBeenCalledWith(
      'test-user-id',
      'test-content-id',
      40,
      'Slides composited',
    );
    expect(redis.emitProgress).toHaveBeenCalledWith(
      'test-user-id',
      'test-content-id',
      90,
      'Encoding complete',
    );
    expect(redis.emitComplete).toHaveBeenCalledWith(
      'test-user-id',
      'test-content-id',
      'assets/test-content-id/carousel.mp4',
      'assets/test-content-id/thumbnail.jpg',
    );
  });

  it('should call S3 downloads for slides with bgImageS3Key and overlayImageS3Key', async () => {
    const job = createMockJob();

    await handler.handle(job);

    expect(s3.download).toHaveBeenCalledWith(
      'assets/bg-0.png',
      '/tmp/test-content-id/bg-0.png',
    );
    expect(s3.download).toHaveBeenCalledWith(
      'assets/overlay-0.png',
      '/tmp/test-content-id/overlay-0.png',
    );
    // Slide 1 has no bgImageS3Key or overlayImageS3Key
    expect(s3.download).toHaveBeenCalledTimes(2);
  });

  it('should update DB to ready/completed on success', async () => {
    const job = createMockJob();

    await handler.handle(job);

    expect(prisma.contentItem.update).toHaveBeenCalledWith({
      where: { id: 'test-content-id' },
      data: {
        renderedS3Key: 'assets/test-content-id/carousel.mp4',
        thumbnailS3Key: 'assets/test-content-id/thumbnail.jpg',
        status: 'ready',
      },
    });
    expect(prisma.renderJob.updateMany).toHaveBeenCalledWith({
      where: {
        contentItemId: 'test-content-id',
        jobType: JOB_TYPE.CAROUSEL_RENDER,
      },
      data: {
        status: 'completed',
        progress: 100,
        completedAt: expect.any(Date),
      },
    });
  });

  it('should set status to failed and re-throw on error', async () => {
    const encodingError = new Error('Encoding failed');
    carouselEncoder.encode.mockRejectedValueOnce(encodingError);

    const job = createMockJob();

    await expect(handler.handle(job)).rejects.toThrow('Encoding failed');

    expect(redis.emitFailed).toHaveBeenCalledWith(
      'test-user-id',
      'test-content-id',
      'Encoding failed',
    );
    expect(prisma.renderJob.updateMany).toHaveBeenCalledWith({
      where: {
        contentItemId: 'test-content-id',
        jobType: JOB_TYPE.CAROUSEL_RENDER,
      },
      data: { status: 'failed', error: 'Encoding failed' },
    });
    expect(prisma.contentItem.update).toHaveBeenCalledWith({
      where: { id: 'test-content-id' },
      data: { status: 'failed' },
    });
  });

  it('should call fs.rm in finally block (cleanup)', async () => {
    const job = createMockJob();

    await handler.handle(job);

    expect(fs.rm).toHaveBeenCalledWith('/tmp/test-content-id', {
      recursive: true,
      force: true,
    });
  });

  it('should call fs.rm even when handler throws', async () => {
    carouselEncoder.encode.mockRejectedValueOnce(new Error('fail'));
    const job = createMockJob();

    await expect(handler.handle(job)).rejects.toThrow('fail');

    expect(fs.rm).toHaveBeenCalledWith('/tmp/test-content-id', {
      recursive: true,
      force: true,
    });
  });

  it("should throw error for outputFormat 'png[]'", async () => {
    const data: CarouselRenderJob = {
      ...mockJobData,
      outputFormat: 'png[]',
    };
    const job = createMockJob(data);

    await expect(handler.handle(job)).rejects.toThrow(
      "outputFormat 'png[]' is not supported in worker-renderer v1",
    );
  });

  it('should re-throw original error even if cleanup fails', async () => {
    const originalError = new Error('Original error');
    carouselEncoder.encode.mockRejectedValueOnce(originalError);
    redis.emitFailed.mockRejectedValueOnce(new Error('Redis down'));

    const job = createMockJob();

    await expect(handler.handle(job)).rejects.toThrow('Original error');
  });
});
