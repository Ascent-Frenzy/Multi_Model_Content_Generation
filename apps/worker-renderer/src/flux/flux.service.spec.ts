import { Test, TestingModule } from '@nestjs/testing';
import { FluxService } from './flux.service';

// Mock @fal-ai/client
const mockSubscribe = jest.fn();
const mockConfig = jest.fn();

jest.mock('@fal-ai/client', () => ({
  fal: {
    config: (...args: unknown[]) => mockConfig(...args),
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
  },
}));

describe('FluxService', () => {
  let service: FluxService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.FAL_AI_KEY = 'test-fal-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [FluxService],
    }).compile();

    service = module.get<FluxService>(FluxService);
    service.onModuleInit();
  });

  afterEach(() => {
    delete process.env.FAL_AI_KEY;
  });

  it('should configure fal with credentials on init', () => {
    expect(mockConfig).toHaveBeenCalledWith({
      credentials: 'test-fal-key',
    });
  });

  describe('generateImage', () => {
    it('should call fal.subscribe with correct endpoint and input', async () => {
      const imageUrl = 'https://fal.ai/output/image.png';
      mockSubscribe.mockResolvedValue({
        data: { images: [{ url: imageUrl }] },
      });

      const result = await service.generateImage(
        'a beautiful sunset',
        1080,
        1920,
      );

      expect(mockSubscribe).toHaveBeenCalledWith('fal-ai/flux/schnell', {
        input: {
          prompt: 'a beautiful sunset',
          image_size: { width: 1080, height: 1920 },
          num_images: 1,
          output_format: 'png',
        },
      });
      expect(result).toBe(imageUrl);
    });

    it('should return the URL from result.data.images[0].url', async () => {
      const expectedUrl = 'https://fal.ai/output/test.png';
      mockSubscribe.mockResolvedValue({
        data: { images: [{ url: expectedUrl }] },
      });

      const url = await service.generateImage('test prompt', 512, 512);
      expect(url).toBe(expectedUrl);
    });
  });
});
