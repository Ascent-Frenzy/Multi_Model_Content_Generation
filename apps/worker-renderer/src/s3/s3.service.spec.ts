import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from './s3.service';
import { Readable } from 'stream';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    GetObjectCommand: jest.fn().mockImplementation((params) => ({
      _type: 'GetObjectCommand',
      ...params,
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => ({
      _type: 'PutObjectCommand',
      ...params,
    })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSignedUrl: mockGetSignedUrl } = require('@aws-sdk/s3-request-presigner');

const mockMkdir = jest.fn().mockResolvedValue(undefined);
jest.mock('fs/promises', () => ({ mkdir: (...args: unknown[]) => mockMkdir(...args) }));

const mockCreateWriteStream = jest.fn();
const mockCreateReadStream = jest.fn();
jest.mock('fs', () => ({
  createWriteStream: (...args: unknown[]) => mockCreateWriteStream(...args),
  createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [S3Service],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  describe('download', () => {
    it('should create parent directory and pipe stream to file', async () => {
      const readable = new Readable({
        read() {
          this.push('data');
          this.push(null);
        },
      });

      mockSend.mockResolvedValue({ Body: readable });

      const mockWritable = {
        on: jest.fn().mockImplementation(function (
          this: unknown,
          event: string,
          cb: () => void,
        ) {
          if (event === 'finish') {
            // Defer so pipe has time to attach
            setTimeout(cb, 0);
          }
          return this;
        }),
      };
      // Give the writable a pipe-friendly shape
      (mockWritable as Record<string, unknown>).write = jest.fn();
      (mockWritable as Record<string, unknown>).end = jest.fn();

      mockCreateWriteStream.mockReturnValue(mockWritable);

      // Mock pipe on the readable to trigger writable finish
      const origPipe = readable.pipe.bind(readable);
      jest.spyOn(readable, 'pipe').mockImplementation((dest: any) => {
        // Simulate finish event
        setTimeout(() => {
          const finishCb = mockWritable.on.mock.calls.find(
            (c: string[]) => c[0] === 'finish',
          )?.[1];
          if (finishCb) finishCb();
        }, 0);
        return dest;
      });

      await service.download('test/key.png', '/tmp/test/key.png');

      expect(mockMkdir).toHaveBeenCalledWith('/tmp/test', { recursive: true });
      expect(mockCreateWriteStream).toHaveBeenCalledWith('/tmp/test/key.png');
    });
  });

  describe('upload', () => {
    it('should send PutObjectCommand with correct params', async () => {
      const mockStream = { pipe: jest.fn() };
      mockCreateReadStream.mockReturnValue(mockStream);
      mockSend.mockResolvedValue({});

      await service.upload('/tmp/file.mp4', 'output/file.mp4', 'video/mp4');

      expect(mockCreateReadStream).toHaveBeenCalledWith('/tmp/file.mp4');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'PutObjectCommand',
          Bucket: 'mmcg-assets',
          Key: 'output/file.mp4',
          Body: mockStream,
          ContentType: 'video/mp4',
        }),
      );
    });
  });

  describe('getObjectUrl', () => {
    it('should return correct URL format', () => {
      const url = service.getObjectUrl('assets/image.png');
      expect(url).toBe(
        'https://mmcg-assets.s3.us-east-1.amazonaws.com/assets/image.png',
      );
    });
  });

  describe('getPresignedUrl', () => {
    it('should call getSignedUrl with correct params', async () => {
      mockGetSignedUrl.mockResolvedValue('https://presigned-url');

      const url = await service.getPresignedUrl('assets/image.png', 7200);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(), // S3Client instance
        expect.objectContaining({
          _type: 'GetObjectCommand',
          Bucket: 'mmcg-assets',
          Key: 'assets/image.png',
        }),
        { expiresIn: 7200 },
      );
      expect(url).toBe('https://presigned-url');
    });
  });
});
