/* eslint-disable @typescript-eslint/no-explicit-any */
import { REDIS_CHANNELS } from '@app/constants';

// ── Mock ioredis before importing the service ────────────────────────────────
const mockPublish = jest.fn().mockResolvedValue(1);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      publish: mockPublish,
      disconnect: mockDisconnect,
    })),
  };
});

import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RedisService();
  });

  it('should publish progress event with correct JSON to render:events channel', async () => {
    await service.emitProgress('content-123', 50, 'compositing');

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({
        type: 'progress',
        contentItemId: 'content-123',
        progress: 50,
        stage: 'compositing',
      }),
    );
  });

  it('should publish complete event with correct JSON', async () => {
    await service.emitComplete(
      'content-456',
      'renders/output.mp4',
      'renders/thumb.png',
    );

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({
        type: 'complete',
        contentItemId: 'content-456',
        renderedS3Key: 'renders/output.mp4',
        thumbnailS3Key: 'renders/thumb.png',
      }),
    );
  });

  it('should publish complete event without optional thumbnailS3Key', async () => {
    await service.emitComplete('content-789', 'renders/output.mp4');

    expect(mockPublish).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockPublish.mock.calls[0][1]);
    expect(payload).toEqual({
      type: 'complete',
      contentItemId: 'content-789',
      renderedS3Key: 'renders/output.mp4',
    });
  });

  it('should publish failed event with correct JSON', async () => {
    await service.emitFailed('content-err', 'FFmpeg crashed');

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish).toHaveBeenCalledWith(
      REDIS_CHANNELS.RENDER_EVENTS,
      JSON.stringify({
        type: 'failed',
        contentItemId: 'content-err',
        error: 'FFmpeg crashed',
      }),
    );
  });

  it('should call disconnect on module destroy', async () => {
    await service.onModuleDestroy();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
