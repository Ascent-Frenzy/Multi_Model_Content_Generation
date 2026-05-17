import { Test, TestingModule } from '@nestjs/testing';
import { InstagramService, InstagramPublishOptions } from './instagram.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InstagramService', () => {
  let service: InstagramService;

  const baseOptions: InstagramPublishOptions = {
    igUserId: '12345',
    accessToken: 'test-access-token',
    mediaUrl: 'https://example.com/media.mp4',
    caption: 'Test caption',
    mediaType: 'IMAGE',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset timers
    jest.useRealTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [InstagramService],
    }).compile();

    service = module.get<InstagramService>(InstagramService);
  });

  describe('publish', () => {
    it('should create container and publish for IMAGE type', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'container-123' } }) // create container
        .mockResolvedValueOnce({ data: { id: 'ig-post-456' } }); // publish

      const result = await service.publish(baseOptions);

      // Verify container creation
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v19.0/12345/media',
        expect.objectContaining({
          caption: 'Test caption',
          access_token: 'test-access-token',
          image_url: 'https://example.com/media.mp4',
        }),
      );

      // Verify publish
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v19.0/12345/media_publish',
        {
          creation_id: 'container-123',
          access_token: 'test-access-token',
        },
      );

      expect(result).toBe('ig-post-456');
    });

    it('should use video_url and media_type REELS for VIDEO type', async () => {
      const videoOptions: InstagramPublishOptions = {
        ...baseOptions,
        mediaType: 'VIDEO',
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'container-789' } })
        .mockResolvedValueOnce({ data: { id: 'ig-post-101' } });

      // Mock polling — return FINISHED immediately
      mockedAxios.get.mockResolvedValueOnce({
        data: { status_code: 'FINISHED' },
      });

      const result = await service.publish(videoOptions);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://graph.facebook.com/v19.0/12345/media',
        expect.objectContaining({
          video_url: 'https://example.com/media.mp4',
          media_type: 'REELS',
          caption: 'Test caption',
          access_token: 'test-access-token',
        }),
      );

      expect(result).toBe('ig-post-101');
    });

    it('should trigger polling for VIDEO type', async () => {
      const videoOptions: InstagramPublishOptions = {
        ...baseOptions,
        mediaType: 'VIDEO',
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'container-poll' } })
        .mockResolvedValueOnce({ data: { id: 'ig-post-poll' } });

      // Return IN_PROGRESS then FINISHED
      mockedAxios.get
        .mockResolvedValueOnce({ data: { status_code: 'IN_PROGRESS' } })
        .mockResolvedValueOnce({ data: { status_code: 'FINISHED' } });

      // Speed up setTimeout
      jest.useFakeTimers();
      const publishPromise = service.publish(videoOptions);

      // Advance through polling intervals
      await jest.advanceTimersByTimeAsync(5000);
      await jest.advanceTimersByTimeAsync(5000);

      jest.useRealTimers();
      const result = await publishPromise;

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toBe('ig-post-poll');
    });

    it('should not poll for IMAGE type', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'container-img' } })
        .mockResolvedValueOnce({ data: { id: 'ig-post-img' } });

      await service.publish(baseOptions);

      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('waitForContainerReady (via publish)', () => {
    it('should resolve when status is FINISHED', async () => {
      const videoOptions: InstagramPublishOptions = {
        ...baseOptions,
        mediaType: 'VIDEO',
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: { id: 'c-finished' } })
        .mockResolvedValueOnce({ data: { id: 'ig-finished' } });

      mockedAxios.get.mockResolvedValueOnce({
        data: { status_code: 'FINISHED' },
      });

      const result = await service.publish(videoOptions);
      expect(result).toBe('ig-finished');
    });

    it('should throw when status is ERROR', async () => {
      const videoOptions: InstagramPublishOptions = {
        ...baseOptions,
        mediaType: 'VIDEO',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'c-error' } });
      mockedAxios.get.mockResolvedValueOnce({
        data: { status_code: 'ERROR' },
      });

      await expect(service.publish(videoOptions)).rejects.toThrow(
        'Instagram media container c-error failed with status ERROR',
      );
    });

    it('should throw on timeout after max attempts', async () => {
      const videoOptions: InstagramPublishOptions = {
        ...baseOptions,
        mediaType: 'VIDEO',
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'c-timeout' },
      });

      // Always return IN_PROGRESS — mock enough calls for all 60 attempts
      mockedAxios.get.mockResolvedValue({
        data: { status_code: 'IN_PROGRESS' },
      });

      // Replace setTimeout with immediate resolution to avoid timing issues
      const originalSetTimeout = global.setTimeout;
      (global as any).setTimeout = (fn: () => void) => {
        fn();
        return 0 as any;
      };

      await expect(service.publish(videoOptions)).rejects.toThrow(
        'Instagram media container c-timeout timed out after 60 attempts',
      );

      expect(mockedAxios.get).toHaveBeenCalledTimes(60);

      global.setTimeout = originalSetTimeout;
    });
  });
});
