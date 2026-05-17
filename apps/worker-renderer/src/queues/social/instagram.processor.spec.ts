import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import { JOB_TYPE } from '@app/constants';
import { InstagramPostJob } from '@app/types';
import { InstagramProcessor } from './instagram.processor';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { S3Service } from '../../s3/s3.service';
import { InstagramService } from '../../instagram/instagram.service';

const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockRm = jest.fn().mockResolvedValue(undefined);

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: (...args: unknown[]) => mockMkdir(...args),
      rm: (...args: unknown[]) => mockRm(...args),
    },
  };
});

// ── Mock factories ──────────────────────────────────────────────────────────

const mockPrisma = {
  scheduledPost: {
    update: jest.fn().mockResolvedValue({}),
  },
  contentItem: {
    update: jest.fn().mockResolvedValue({}),
  },
};

const mockS3 = {
  download: jest.fn().mockResolvedValue(undefined),
  getPresignedUrl: jest.fn().mockResolvedValue('https://presigned-url.example.com/asset.jpg'),
};

const mockInstagram = {
  publish: jest.fn().mockResolvedValue('ig-post-123'),
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const baseJobData: InstagramPostJob = {
  jobType: 'instagram_post',
  scheduledPostId: 'sp-1',
  contentItemId: 'ci-1',
  renderedS3Key: 'renders/ci-1/output.jpg',
  caption: 'Hello Instagram!',
  igUserId: 'ig-user-42',
  accessToken: 'access-token-abc',
};

function createJob(
  overrides: Partial<{
    name: string;
    data: Partial<InstagramPostJob>;
    opts: Partial<{ attempts: number }>;
    attemptsMade: number;
    id: string;
  }> = {},
): Job<InstagramPostJob> {
  return {
    id: overrides.id ?? 'job-1',
    name: overrides.name ?? JOB_TYPE.INSTAGRAM_POST,
    data: { ...baseJobData, ...overrides.data },
    opts: { attempts: 3, ...overrides.opts },
    attemptsMade: overrides.attemptsMade ?? 0,
  } as unknown as Job<InstagramPostJob>;
}

// ── Test suite ──────────────────────────────────────────────────────────────

describe('InstagramProcessor', () => {
  let processor: InstagramProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock implementations to defaults
    mockPrisma.scheduledPost.update.mockResolvedValue({});
    mockPrisma.contentItem.update.mockResolvedValue({});
    mockS3.download.mockResolvedValue(undefined);
    mockS3.getPresignedUrl.mockResolvedValue('https://presigned-url.example.com/asset.jpg');
    mockInstagram.publish.mockResolvedValue('ig-post-123');
    mockMkdir.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: S3Service, useValue: mockS3 },
        { provide: InstagramService, useValue: mockInstagram },
      ],
    }).compile();

    processor = module.get<InstagramProcessor>(InstagramProcessor);
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it('should update ScheduledPost status to "posting" at start', async () => {
    await processor.process(createJob());

    expect(mockPrisma.scheduledPost.update).toHaveBeenCalledWith({
      where: { id: 'sp-1' },
      data: { status: 'posting' },
    });

    // Ensure it was the first DB call
    const firstCall = mockPrisma.scheduledPost.update.mock.calls[0];
    expect(firstCall[0].data.status).toBe('posting');
  });

  it('should call S3 download with the correct key', async () => {
    await processor.process(createJob());

    expect(mockS3.download).toHaveBeenCalledWith(
      'renders/ci-1/output.jpg',
      '/tmp/ci-1/asset.jpg',
    );
  });

  it('should call getPresignedUrl (not getObjectUrl) for Instagram media URL', async () => {
    await processor.process(createJob());

    expect(mockS3.getPresignedUrl).toHaveBeenCalledWith(
      'renders/ci-1/output.jpg',
      3600,
    );
  });

  it('should call InstagramService.publish with correct params for IMAGE', async () => {
    mockS3.getPresignedUrl.mockResolvedValue('https://presigned.example.com/asset.jpg');

    await processor.process(createJob());

    expect(mockInstagram.publish).toHaveBeenCalledWith({
      igUserId: 'ig-user-42',
      accessToken: 'access-token-abc',
      mediaUrl: 'https://presigned.example.com/asset.jpg',
      caption: 'Hello Instagram!',
      mediaType: 'IMAGE',
    });
  });

  it('should call InstagramService.publish with VIDEO mediaType for .mp4 keys', async () => {
    mockS3.getPresignedUrl.mockResolvedValue('https://presigned.example.com/asset.mp4');

    const job = createJob({
      data: { renderedS3Key: 'renders/ci-1/output.mp4' },
    });

    await processor.process(job);

    expect(mockS3.download).toHaveBeenCalledWith(
      'renders/ci-1/output.mp4',
      '/tmp/ci-1/asset.mp4',
    );
    expect(mockInstagram.publish).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'VIDEO' }),
    );
  });

  it('should update ScheduledPost to "posted" with igId and postedAt on success', async () => {
    mockInstagram.publish.mockResolvedValue('ig-post-999');

    await processor.process(createJob());

    expect(mockPrisma.scheduledPost.update).toHaveBeenCalledWith({
      where: { id: 'sp-1' },
      data: {
        status: 'posted',
        instagramPostId: 'ig-post-999',
        postedAt: expect.any(Date),
      },
    });
  });

  it('should update ContentItem to "published" on success', async () => {
    await processor.process(createJob());

    expect(mockPrisma.contentItem.update).toHaveBeenCalledWith({
      where: { id: 'ci-1' },
      data: { status: 'published' },
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────

  it('should throw Error for unknown job names', async () => {
    const job = createJob({ name: 'unknown_job_type' });

    await expect(processor.process(job)).rejects.toThrow(
      'Unknown social job type: unknown_job_type',
    );
  });

  it('should set ScheduledPost to "failed" on last retry failure', async () => {
    const publishError = new Error('Instagram API error');
    mockInstagram.publish.mockRejectedValue(publishError);

    const job = createJob({
      opts: { attempts: 3 },
      attemptsMade: 2, // >= 3 - 1 → last attempt
    });

    await expect(processor.process(job)).rejects.toThrow('Instagram API error');

    expect(mockPrisma.scheduledPost.update).toHaveBeenCalledWith({
      where: { id: 'sp-1' },
      data: { status: 'failed' },
    });
  });

  it('should NOT set ScheduledPost to "failed" on non-last retry failure', async () => {
    const publishError = new Error('Temporary error');
    mockInstagram.publish.mockRejectedValue(publishError);

    const job = createJob({
      opts: { attempts: 3 },
      attemptsMade: 0, // first attempt, not last
    });

    await expect(processor.process(job)).rejects.toThrow('Temporary error');

    // scheduledPost.update should only have been called once (the 'posting' update)
    const failedCalls = mockPrisma.scheduledPost.update.mock.calls.filter(
      (call: any[]) => call[0].data.status === 'failed',
    );
    expect(failedCalls).toHaveLength(0);
  });

  it('should re-throw the original error even if DB update in catch block fails', async () => {
    const originalError = new Error('Instagram API exploded');
    mockInstagram.publish.mockRejectedValue(originalError);

    // Make the failure-status DB update also fail
    mockPrisma.scheduledPost.update
      .mockResolvedValueOnce({}) // 'posting' update succeeds
      .mockRejectedValueOnce(new Error('DB connection lost')); // 'failed' update fails

    const job = createJob({
      opts: { attempts: 3 },
      attemptsMade: 2, // last attempt
    });

    await expect(processor.process(job)).rejects.toThrow(
      'Instagram API exploded',
    );
  });

  // ── Cleanup ─────────────────────────────────────────────────────────────

  it('should clean up tmpDir in finally block on success', async () => {
    await processor.process(createJob());

    expect(mockRm).toHaveBeenCalledWith('/tmp/ci-1', {
      recursive: true,
      force: true,
    });
  });

  it('should clean up tmpDir in finally block on failure', async () => {
    mockInstagram.publish.mockRejectedValue(new Error('fail'));

    const job = createJob({ attemptsMade: 0 });

    await expect(processor.process(job)).rejects.toThrow('fail');

    expect(mockRm).toHaveBeenCalledWith('/tmp/ci-1', {
      recursive: true,
      force: true,
    });
  });

  // ── Worker events ───────────────────────────────────────────────────────

  it('should log on failed event', () => {
    const logSpy = jest.spyOn(processor['logger'], 'error').mockImplementation();
    const job = createJob({ id: 'job-fail-1' });

    processor.onFailed(job, new Error('something broke'));

    expect(logSpy).toHaveBeenCalledWith(
      'Instagram post job job-fail-1 failed: something broke',
    );
  });

  it('should log on completed event', () => {
    const logSpy = jest.spyOn(processor['logger'], 'log').mockImplementation();
    const job = createJob({ id: 'job-done-1' });

    processor.onCompleted(job);

    expect(logSpy).toHaveBeenCalledWith(
      'Instagram post job job-done-1 completed',
    );
  });
});
