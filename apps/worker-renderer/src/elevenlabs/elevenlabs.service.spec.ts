import { Test, TestingModule } from '@nestjs/testing';
import { ElevenLabsService } from './elevenlabs.service';

// Mock ElevenLabsClient
const mockConvert = jest.fn();

jest.mock('elevenlabs', () => ({
  ElevenLabsClient: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convert: mockConvert,
    },
  })),
}));

describe('ElevenLabsService', () => {
  let service: ElevenLabsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = 'test-api-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [ElevenLabsService],
    }).compile();

    service = module.get<ElevenLabsService>(ElevenLabsService);
  });

  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
  });

  describe('generateSpeech', () => {
    it('should call textToSpeech.convert with correct params', async () => {
      const chunk1 = Buffer.from('audio-chunk-1');
      const chunk2 = Buffer.from('audio-chunk-2');

      // Create an async iterable to simulate the stream
      async function* mockStream() {
        yield chunk1;
        yield chunk2;
      }

      mockConvert.mockResolvedValue(mockStream());

      await service.generateSpeech('Hello world', 'voice-123');

      expect(mockConvert).toHaveBeenCalledWith('voice-123', {
        text: 'Hello world',
        model_id: 'eleven_monolingual_v1',
        output_format: 'mp3_44100_128',
      });
    });

    it('should collect stream chunks into a Buffer', async () => {
      const chunk1 = Buffer.from('part1');
      const chunk2 = Buffer.from('part2');
      const chunk3 = Buffer.from('part3');

      async function* mockStream() {
        yield chunk1;
        yield chunk2;
        yield chunk3;
      }

      mockConvert.mockResolvedValue(mockStream());

      const result = await service.generateSpeech('Test text', 'voice-456');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('part1part2part3');
      expect(result.length).toBe(
        chunk1.length + chunk2.length + chunk3.length,
      );
    });
  });
});
