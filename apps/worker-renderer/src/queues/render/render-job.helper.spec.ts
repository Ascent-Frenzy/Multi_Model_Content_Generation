import { promises as fs } from 'fs';
import { JOB_TYPE } from '@app/constants';
import { RenderJobHelper } from './render-job.helper';

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

describe('RenderJobHelper', () => {
  const contentItemId = 'test-item-123';
  const jobType = JOB_TYPE.CAROUSEL_RENDER;
  let prisma: Record<string, any>;
  let redis: Record<string, jest.Mock>;
  let helper: RenderJobHelper;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      renderJob: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      contentItem: { update: jest.fn().mockResolvedValue({}) },
    };

    redis = {
      emitProgress: jest.fn().mockResolvedValue(undefined),
      emitComplete: jest.fn().mockResolvedValue(undefined),
      emitFailed: jest.fn().mockResolvedValue(undefined),
    };

    helper = new RenderJobHelper(
      prisma as any,
      redis as any,
      contentItemId,
      jobType,
    );
  });

  it('should expose tmpDir based on contentItemId', () => {
    expect(helper.tmpDir).toBe('/tmp/test-item-123');
  });

  describe('progress', () => {
    it('should emit progress via Redis and update DB', async () => {
      await helper.progress(50, 'Halfway');

      expect(redis.emitProgress).toHaveBeenCalledWith(contentItemId, 50, 'Halfway');
      expect(prisma.renderJob.updateMany).toHaveBeenCalledWith({
        where: { contentItemId, jobType },
        data: { progress: 50 },
      });
    });

    it('should include status=processing when percent is 5', async () => {
      await helper.progress(5, 'Job started');

      expect(prisma.renderJob.updateMany).toHaveBeenCalledWith({
        where: { contentItemId, jobType },
        data: { status: 'processing', progress: 5 },
      });
    });
  });

  describe('complete', () => {
    it('should emit complete, update ContentItem, and update RenderJob', async () => {
      await helper.complete('render-key', 'thumb-key');

      expect(redis.emitComplete).toHaveBeenCalledWith(contentItemId, 'render-key', 'thumb-key');
      expect(prisma.contentItem.update).toHaveBeenCalledWith({
        where: { id: contentItemId },
        data: { renderedS3Key: 'render-key', thumbnailS3Key: 'thumb-key', status: 'ready' },
      });
      expect(prisma.renderJob.updateMany).toHaveBeenCalledWith({
        where: { contentItemId, jobType },
        data: { status: 'completed', progress: 100, completedAt: expect.any(Date) },
      });
    });
  });

  describe('fail', () => {
    it('should emit failed event and update DB to failed', async () => {
      await helper.fail(new Error('boom'));

      expect(redis.emitFailed).toHaveBeenCalledWith(contentItemId, 'boom');
      expect(prisma.renderJob.updateMany).toHaveBeenCalledWith({
        where: { contentItemId, jobType },
        data: { status: 'failed', error: 'boom' },
      });
      expect(prisma.contentItem.update).toHaveBeenCalledWith({
        where: { id: contentItemId },
        data: { status: 'failed' },
      });
    });

    it('should swallow cleanup errors', async () => {
      redis.emitFailed.mockRejectedValue(new Error('Redis down'));

      // Should not throw
      await expect(helper.fail(new Error('original'))).resolves.toBeUndefined();
    });

    it('should still update DB when Redis emitFailed fails', async () => {
      redis.emitFailed.mockRejectedValue(new Error('Redis down'));

      await helper.fail(new Error('boom'));

      // DB updates should still have been called despite Redis failure
      expect(prisma.renderJob.updateMany).toHaveBeenCalledWith({
        where: { contentItemId, jobType },
        data: { status: 'failed', error: 'boom' },
      });
      expect(prisma.contentItem.update).toHaveBeenCalledWith({
        where: { id: contentItemId },
        data: { status: 'failed' },
      });
    });

    it('should still update ContentItem when renderJob update fails', async () => {
      prisma.renderJob.updateMany.mockRejectedValue(new Error('DB error'));

      await helper.fail(new Error('boom'));

      expect(prisma.contentItem.update).toHaveBeenCalledWith({
        where: { id: contentItemId },
        data: { status: 'failed' },
      });
    });
  });

  describe('run', () => {
    it('should create tmpDir, execute fn, and clean up', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);

      await helper.run(fn);

      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/test-item-123', { recursive: true });
      expect(fn).toHaveBeenCalled();
      expect(fs.rm).toHaveBeenCalledWith('/tmp/test-item-123', {
        recursive: true,
        force: true,
      });
    });

    it('should call fail() and re-throw if fn throws', async () => {
      const error = new Error('fn exploded');

      await expect(
        helper.run(async () => {
          throw error;
        }),
      ).rejects.toThrow('fn exploded');

      expect(redis.emitFailed).toHaveBeenCalledWith(contentItemId, 'fn exploded');
      expect(fs.rm).toHaveBeenCalled();
    });

    it('should clean up even when fail() itself throws', async () => {
      redis.emitFailed.mockRejectedValue(new Error('Redis down'));

      await expect(
        helper.run(async () => {
          throw new Error('original');
        }),
      ).rejects.toThrow('original');

      expect(fs.rm).toHaveBeenCalledWith('/tmp/test-item-123', {
        recursive: true,
        force: true,
      });
    });
  });
});
