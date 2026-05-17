import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import sharp from 'sharp';
import { CarouselRenderJob } from '@app/types';
import { JOB_TYPE } from '@app/constants';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { S3Service } from '../../s3/s3.service';
import { CarouselEncoder } from '../../ffmpeg/carousel-encoder';
import { RenderJobHelper } from './render-job.helper';

function hexToRgba(hex: string): {
  r: number;
  g: number;
  b: number;
  alpha: number;
} {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
    alpha: 1,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class CarouselHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly s3: S3Service,
    private readonly carouselEncoder: CarouselEncoder,
  ) {}

  async handle(job: Job<CarouselRenderJob>): Promise<void> {
    const { contentItemId, slides, dimensions, outputFormat } = job.data;
    const { width, height } = dimensions;

    const helper = new RenderJobHelper(
      this.prisma,
      this.redis,
      contentItemId,
      JOB_TYPE.CAROUSEL_RENDER,
    );

    await helper.run(async () => {
      if (outputFormat !== 'mp4') {
        throw new Error(
          "outputFormat 'png[]' is not supported in worker-renderer v1",
        );
      }

      const tmpDir = helper.tmpDir;

      // 1. Start
      await helper.progress(5, 'Job started');

      // 2. Download assets in parallel
      const downloadPromises: Promise<void>[] = [];
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        if (slide.bgImageS3Key) {
          downloadPromises.push(
            this.s3.download(slide.bgImageS3Key, `${tmpDir}/bg-${i}.png`),
          );
        }
        if (slide.overlayImageS3Key) {
          downloadPromises.push(
            this.s3.download(
              slide.overlayImageS3Key,
              `${tmpDir}/overlay-${i}.png`,
            ),
          );
        }
      }
      await Promise.all(downloadPromises);

      await helper.progress(20, 'Assets downloaded');

      // 3. Composite each slide with sharp
      const slidePaths: string[] = [];
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slidePath = `${tmpDir}/slide-${i}.png`;
        slidePaths.push(slidePath);

        // Create base image
        const base = slide.bgImageS3Key
          ? sharp(`${tmpDir}/bg-${i}.png`).resize(width, height, { fit: 'cover' })
          : sharp({
              create: {
                width,
                height,
                channels: 4,
                background: hexToRgba(slide.bgColor),
              },
            });

        // Build SVG text overlay
        const textColor = slide.textColor || '#FFFFFF';
        const svgText = `
          <svg width="${width}" height="${height}">
            <text x="50%" y="40%" text-anchor="middle" font-size="64" font-weight="bold" fill="${escapeXml(textColor)}" font-family="sans-serif">
              ${escapeXml(slide.headline)}
            </text>
            <text x="50%" y="55%" text-anchor="middle" font-size="36" fill="${escapeXml(textColor)}" font-family="sans-serif">
              ${escapeXml(slide.body)}
            </text>
          </svg>`;

        // Build composite layers
        const compositeInputs: sharp.OverlayOptions[] = [
          { input: Buffer.from(svgText), top: 0, left: 0 },
        ];

        // Optional overlay image resized to 40% of dimensions
        if (slide.overlayImageS3Key) {
          const overlayWidth = Math.round(width * 0.4);
          const overlayHeight = Math.round(height * 0.4);
          const overlayBuffer = await sharp(`${tmpDir}/overlay-${i}.png`)
            .resize(overlayWidth, overlayHeight, { fit: 'inside' })
            .toBuffer();
          compositeInputs.push({ input: overlayBuffer, gravity: 'center' });
        }

        await base.composite(compositeInputs).png().toFile(slidePath);
      }

      await helper.progress(40, 'Slides composited');

      // 4. Encode carousel video
      const carouselOutputPath = `${tmpDir}/carousel.mp4`;
      await this.carouselEncoder.encode(slidePaths, carouselOutputPath, 3);

      await helper.progress(90, 'Encoding complete');

      // 5. Upload carousel + thumbnail to S3
      const renderedS3Key = `assets/${contentItemId}/carousel.mp4`;
      await this.s3.upload(carouselOutputPath, renderedS3Key, 'video/mp4');

      const thumbnailPath = `${tmpDir}/thumbnail.jpg`;
      await sharp(slidePaths[0])
        .resize(320, 320, { fit: 'cover' })
        .jpeg()
        .toFile(thumbnailPath);
      const thumbnailS3Key = `assets/${contentItemId}/thumbnail.jpg`;
      await this.s3.upload(thumbnailPath, thumbnailS3Key, 'image/jpeg');

      // 6. Complete
      await helper.complete(renderedS3Key, thumbnailS3Key);
    });
  }
}
