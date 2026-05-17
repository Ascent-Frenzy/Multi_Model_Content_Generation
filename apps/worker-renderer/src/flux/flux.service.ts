import { Injectable, OnModuleInit } from '@nestjs/common';
import { fal } from '@fal-ai/client';

@Injectable()
export class FluxService implements OnModuleInit {
  onModuleInit(): void {
    fal.config({ credentials: process.env.FAL_AI_KEY });
  }

  async generateImage(
    prompt: string,
    width: number,
    height: number,
  ): Promise<string> {
    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: { width, height },
        num_images: 1,
        output_format: 'png',
      },
    });

    return result.data.images[0].url;
  }
}
