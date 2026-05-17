import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { fal } from '@fal-ai/client';

@Injectable()
export class FluxService implements OnModuleInit {
  private readonly logger = new Logger(FluxService.name);

  onModuleInit(): void {
    const apiKey = process.env.FAL_AI_KEY;
    if (!apiKey) {
      this.logger.warn('FAL_AI_KEY is not set — Flux image generation will fail');
    }
    fal.config({ credentials: apiKey });
  }

  async generateImage(
    prompt: string,
    width: number,
    height: number,
  ): Promise<string> {
    const apiKey = process.env.FAL_AI_KEY;
    if (!apiKey) throw new Error('FAL_AI_KEY is not set');

    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: { width, height },
        num_inference_steps: 4,
        num_images: 1,
        output_format: 'png',
        enable_safety_checker: false,
      },
    });

    const images = (result.data as any)?.images;
    if (!images?.length) {
      throw new Error('Flux returned no images');
    }
    return images[0].url;
  }
}
