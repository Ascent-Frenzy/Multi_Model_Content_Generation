import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import { ReelHandler } from './reel-handler';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { S3Service } from '../../s3/s3.service';
import { FluxService } from '../../flux/flux.service';
import { ElevenLabsService } from '../../elevenlabs/elevenlabs.service';
import { ReelEncoder } from '../../ffmpeg/reel-encoder';
import { FfmpegService } from '../../ffmpeg/ffmpeg.service';
import { ReelRenderJob } from '@app/types';
import { JOB_TYPE } from '@app/constants';

// Mock sharp
jest.mock('sharp', () => {
  const mockSharpInstance = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  };
  const sharpFn = jest.fn().mockReturnValue(mockSharpInstance);
  return { __esModule: true, default: sharpFn };
});

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: Buffer.from('fake-image') }),
  },
}));

// Mock fs
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: jest.fn().mockResolvedValue(undefined),
      rm: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('ReelHandler', () => {
  let handler: ReelHandler;
  let prisma: Record<string, any>;
  let redis: jest.Mocked<RedisService>;
  let s3: jest.Mocked<S3Service>;
  let fluxService: jest.Mocked<FluxService>;
  let elevenLabsService: jest.Mocked<ElevenLabsService>;
  let reelEncoder: jest.Mocked<ReelEncoder>;
  let ffmpegService: jest.Mocked<FfmpegService>;

  const mockJobData: ReelRenderJob = {
    jobType: 'reel_render',
    contentItemId: 'test-reel-id',
    brandProfileId: 'brand-1',
    script: 'This is the voiceover script.',
    voiceId: 'voice-123',
    segments: [
      {
        order: 0,
        type: 'clip',
        assetS3Key: 'assets/clip-0.mp4',
        startSec: 0,
        endSec: 5,
        caption: 'Opening scene',
      },
      {
        order: 1,
        type: 'flux_image',
        fluxPrompt: 'A beautiful sunset over mountains',
        startSec: 5,
        endSec: 10,
        caption: 'Sunset view',
      },
      {
        order: 2,
        type: 'static_image',
        assetS3Key: 'assets/static-2.png',
        startSec: 10,
        endSec: 15,
      },
    ],
    dimensions: { width: 1080, height: 1920 },
  };

  function createMockJob(
    data: ReelRenderJob = mockJobData,
  ): Job<ReelRenderJob> {
    return {
      id: 'reel-job-1',
      name: JOB_TYPE.REEL_RENDER,
      data,
    } as unknown as Job<ReelRenderJob>;
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

    const mockFlux = {
      generateImage: jest
        .fn()
        .mockResolvedValue('https://fal.ai/generated-image.png'),
    };

    const mockElevenLabs = {
      generateSpeech: jest
        .fn()
        .mockResolvedValue(Buffer.from('fake-audio-data')),
    };

    const mockReelEncoder = {
      encode: jest.fn().mockResolvedValue(undefined),
    };

    const mockFfmpegService = {
      extractFrame: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReelHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: S3Service, useValue: mockS3 },
        { provide: FluxService, useValue: mockFlux },
        { provide: ElevenLabsService, useValue: mockElevenLabs },
        { provide: ReelEncoder, useValue: mockReelEncoder },
        { provide: FfmpegService, useValue: mockFfmpegService },
      ],
    }).compile();

    handler = module.get<ReelHandler>(ReelHandler);
    redis = module.get(RedisService);
    s3 = module.get(S3Service);
    fluxService = module.get(FluxService);
    elevenLabsService = module.get(ElevenLabsService);
    reelEncoder = module.get(ReelEncoder);
    ffmpegService = module.get(FfmpegService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute voiceover, flux, and asset downloads in parallel', async () => {
    const job = createMockJob();

    await handler.handle(job);

    // Voiceover generated
    expect(elevenLabsService.generateSpeech).toHaveBeenCalledWith(
      'This is the voiceover script.',
      'voice-123',
    );

    // Flux image generated for segment 1
    expect(fluxService.generateImage).toHaveBeenCalledWith(
      'A beautiful sunset over mountains',
      1080,
      1920,
    );

    // Existing assets downloaded: clip (segment 0) and static_image (segment 2)
    expect(s3.download).toHaveBeenCalledWith(
      'assets/clip-0.mp4',
      '/tmp/test-reel-id/segment-0.mp4',
    );
    expect(s3.download).toHaveBeenCalledWith(
      'assets/static-2.png',
      '/tmp/test-reel-id/segment-2.png',
    );
  });

  it('should compute durationSecs from endSec - startSec', async () => {
    const job = createMockJob();

    await handler.handle(job);

    const encodeCall = reelEncoder.encode.mock.calls[0][0];
    const segments = encodeCall.segments;

    expect(segments[0].durationSecs).toBe(5); // 5 - 0
    expect(segments[1].durationSecs).toBe(5); // 10 - 5
    expect(segments[2].durationSecs).toBe(5); // 15 - 10
  });

  it('should pass caption through to encoder (not undefined)', async () => {
    const job = createMockJob();

    await handler.handle(job);

    const encodeCall = reelEncoder.encode.mock.calls[0][0];
    const segments = encodeCall.segments;

    // Segment 0 has caption 'Opening scene'
    expect(segments[0].caption).toBe('Opening scene');
    // Segment 1 has caption 'Sunset view'
    expect(segments[1].caption).toBe('Sunset view');
    // Segment 2 has no caption — should be undefined (passed through from source)
    expect(segments[2]).toHaveProperty('caption');
    expect(segments[2].caption).toBeUndefined();
  });

  it('should call encoder with correct segment list', async () => {
    const job = createMockJob();

    await handler.handle(job);

    expect(reelEncoder.encode).toHaveBeenCalledWith({
      segments: [
        {
          path: '/tmp/test-reel-id/segment-0.mp4',
          durationSecs: 5,
          type: 'video',
          caption: 'Opening scene',
        },
        {
          path: '/tmp/test-reel-id/flux-1.png',
          durationSecs: 5,
          type: 'image',
          caption: 'Sunset view',
        },
        {
          path: '/tmp/test-reel-id/segment-2.png',
          durationSecs: 5,
          type: 'image',
          caption: undefined,
        },
      ],
      voiceoverPath: '/tmp/test-reel-id/voiceover.mp3',
      outputPath: '/tmp/test-reel-id/reel.mp4',
      width: 1080,
      height: 1920,
    });
  });

  it('should use ffmpegService.extractFrame for video thumbnail', async () => {
    // First segment is a clip (video type)
    const job = createMockJob();

    await handler.handle(job);

    expect(ffmpegService.extractFrame).toHaveBeenCalledWith(
      '/tmp/test-reel-id/segment-0.mp4',
      '/tmp/test-reel-id/frame-0.png',
      0,
    );
  });

  it('should use sharp directly for image thumbnail', async () => {
    const sharp = require('sharp').default;
    const imageFirstData: ReelRenderJob = {
      ...mockJobData,
      segments: [
        {
          order: 0,
          type: 'static_image',
          assetS3Key: 'assets/static-0.png',
          startSec: 0,
          endSec: 5,
        },
      ],
    };
    const job = createMockJob(imageFirstData);

    await handler.handle(job);

    // Should NOT call extractFrame for image
    expect(ffmpegService.extractFrame).not.toHaveBeenCalled();

    // Should call sharp with the image path
    expect(sharp).toHaveBeenCalledWith('/tmp/test-reel-id/segment-0.png');
  });

  it('should set status to failed and re-throw on error', async () => {
    const encodeError = new Error('FFmpeg crashed');
    reelEncoder.encode.mockRejectedValueOnce(encodeError);

    const job = createMockJob();

    await expect(handler.handle(job)).rejects.toThrow('FFmpeg crashed');

    expect(redis.emitFailed).toHaveBeenCalledWith(
      'test-reel-id',
      'FFmpeg crashed',
    );
    expect(prisma.renderJob.updateMany).toHaveBeenCalledWith({
      where: {
        contentItemId: 'test-reel-id',
        jobType: JOB_TYPE.REEL_RENDER,
      },
      data: { status: 'failed', error: 'FFmpeg crashed' },
    });
    expect(prisma.contentItem.update).toHaveBeenCalledWith({
      where: { id: 'test-reel-id' },
      data: { status: 'failed' },
    });
  });

  it('should cleanup tmpDir in finally block', async () => {
    const job = createMockJob();

    await handler.handle(job);

    expect(fs.rm).toHaveBeenCalledWith('/tmp/test-reel-id', {
      recursive: true,
      force: true,
    });
  });

  it('should cleanup tmpDir even when handler throws', async () => {
    reelEncoder.encode.mockRejectedValueOnce(new Error('fail'));
    const job = createMockJob();

    await expect(handler.handle(job)).rejects.toThrow('fail');

    expect(fs.rm).toHaveBeenCalledWith('/tmp/test-reel-id', {
      recursive: true,
      force: true,
    });
  });

  it('should re-throw original error even if cleanup fails', async () => {
    const originalError = new Error('Original error');
    reelEncoder.encode.mockRejectedValueOnce(originalError);
    redis.emitFailed.mockRejectedValueOnce(new Error('Redis down'));

    const job = createMockJob();

    await expect(handler.handle(job)).rejects.toThrow('Original error');
  });

  it('should emit progress events in correct order', async () => {
    const job = createMockJob();

    await handler.handle(job);

    expect(redis.emitProgress).toHaveBeenCalledWith(
      'test-reel-id',
      5,
      'Job started',
    );
    expect(redis.emitProgress).toHaveBeenCalledWith(
      'test-reel-id',
      40,
      'Voiceover generated',
    );
    expect(redis.emitProgress).toHaveBeenCalledWith(
      'test-reel-id',
      70,
      'All assets generated and downloaded',
    );
    expect(redis.emitProgress).toHaveBeenCalledWith(
      'test-reel-id',
      90,
      'Encoding complete',
    );
    expect(redis.emitComplete).toHaveBeenCalledWith(
      'test-reel-id',
      'assets/test-reel-id/reel.mp4',
      'assets/test-reel-id/thumbnail.jpg',
    );
  });
});
