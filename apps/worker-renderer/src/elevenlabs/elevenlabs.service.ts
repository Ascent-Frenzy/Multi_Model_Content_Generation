import { Injectable } from '@nestjs/common';
import { ElevenLabsClient } from 'elevenlabs';

@Injectable()
export class ElevenLabsService {
  private readonly client: ElevenLabsClient;

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }

  async generateSpeech(text: string, voiceId: string): Promise<Buffer> {
    const audioStream = await this.client.textToSpeech.convert(voiceId, {
      text,
      model_id: 'eleven_monolingual_v1',
      output_format: 'mp3_44100_128',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
