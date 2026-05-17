import { Test, TestingModule } from '@nestjs/testing';
import { FfmpegService } from './ffmpeg.service';
import { EventEmitter } from 'events';

// Mock @ffmpeg-installer/ffmpeg
jest.mock('@ffmpeg-installer/ffmpeg', () => ({
  path: '/usr/bin/ffmpeg',
}));

// Mock fluent-ffmpeg — use inline jest.fn() to avoid hoisting issues
jest.mock('fluent-ffmpeg', () => {
  const fn: any = jest.fn();
  fn.setFfmpegPath = jest.fn();
  return { __esModule: true, default: fn };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockFfmpegModule = require('fluent-ffmpeg').default;
const mockSetFfmpegPath = mockFfmpegModule.setFfmpegPath as jest.Mock;

describe('FfmpegService', () => {
  let service: FfmpegService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FfmpegService],
    }).compile();

    service = module.get<FfmpegService>(FfmpegService);
  });

  it('should set ffmpeg path on construction', () => {
    expect(mockSetFfmpegPath).toHaveBeenCalledWith('/usr/bin/ffmpeg');
  });

  describe('runCommand', () => {
    it('should resolve on end event', async () => {
      const emitter = new EventEmitter();
      const mockCommand = {
        on: jest.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: (...args: unknown[]) => void,
        ) {
          emitter.on(event, cb);
          return this;
        }),
        run: jest.fn().mockImplementation(() => {
          emitter.emit('end');
        }),
      } as any;

      await expect(service.runCommand(mockCommand)).resolves.toBeUndefined();
      expect(mockCommand.run).toHaveBeenCalled();
    });

    it('should reject on error event', async () => {
      const emitter = new EventEmitter();
      const testError = new Error('ffmpeg failed');
      const mockCommand = {
        on: jest.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: (...args: unknown[]) => void,
        ) {
          emitter.on(event, cb);
          return this;
        }),
        run: jest.fn().mockImplementation(() => {
          emitter.emit('error', testError);
        }),
      } as any;

      await expect(service.runCommand(mockCommand)).rejects.toThrow(
        'ffmpeg failed',
      );
      expect(mockCommand.run).toHaveBeenCalled();
    });
  });
});
