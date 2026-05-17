import { Injectable } from '@nestjs/common';
import { ElevenLabsClient } from 'elevenlabs';

@Injectable()
export class ElevenLabsService {
  private _client: ElevenLabsClient | null = null;

  private get client(): ElevenLabsClient {
    if (!this._client) {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
      this._client = new ElevenLabsClient({ apiKey });
    }
    return this._client;
  }

  async generateSpeech(text: string, voiceId: string): Promise<Buffer> {
    const audioStream = await this.client.textToSpeech.convert(voiceId, {
      text,
      model_id: 'eleven_turbo_v2_5',
      output_format: 'mp3_44100_128',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
