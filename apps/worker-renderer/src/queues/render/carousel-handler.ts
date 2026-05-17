import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import { CarouselRenderJob } from '@app/types';
import { JOB_TYPE } from '@app/constants';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { S3Service } from '../../s3/s3.service';
import { CarouselEncoder } from '../../ffmpeg/carousel-encoder';

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
  private readonly logger = new Logger(CarouselHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly s3: S3Service,
    private readonly carouselEncoder: CarouselEncoder,
  ) {}

  async handle(job: Job<CarouselRenderJob>): Promise<void> {
    const { contentItemId, slides, dimensions, outputFormat } = job.data;
    const { width, height } = dimensions;

    if (outputFormat !== 'mp4') {
      throw new Error(
        "outputFormat 'png[]' is not supported in worker-renderer v1",
      );
    }

    const tmpDir = `/tmp/${contentItemId}`;
    await fs.mkdir(tmpDir, { recursive: true });

    try {
      // 1. Emit progress 5%
      await this.redis.emitProgress(contentItemId, 5, 'Job started');
      await this.prisma.renderJob.updateMany({
        where: { contentItemId, jobType: JOB_TYPE.CAROUSEL_RENDER },
        data: { status: 'processing', progress: 5 },
      });

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

      // 3. Emit progress 20%
      await this.redis.emitProgress(contentItemId, 20, 'Assets downloaded');
      await this.prisma.renderJob.updateMany({
        where: { contentItemId, jobType: JOB_TYPE.CAROUSEL_RENDER },
        data: { progress: 20 },
      });

      // 4. Composite each slide with sharp
      const slidePaths: string[] = [];
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slidePath = `${tmpDir}/slide-${i}.png`;
        slidePaths.push(slidePath);

        // Create base image
        let base: sharp.Sharp;
        if (slide.bgImageS3Key) {
          base = sharp(`${tmpDir}/bg-${i}.png`).resize(width, height, {
            fit: 'cover',
          });
        } else {
          base = sharp({
            create: {
              width,
              height,
              channels: 4,
              background: hexToRgba(slide.bgColor),
            },
          });
        }

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
        const svgBuffer = Buffer.from(svgText);

        // Build composite layers
        const compositeInputs: sharp.OverlayOptions[] = [
          { input: svgBuffer, top: 0, left: 0 },
        ];

        // Optional overlay image resized to 40% of dimensions
        if (slide.overlayImageS3Key) {
          const overlayWidth = Math.round(width * 0.4);
          const overlayHeight = Math.round(height * 0.4);
          const overlayBuffer = await sharp(`${tmpDir}/overlay-${i}.png`)
            .resize(overlayWidth, overlayHeight, { fit: 'inside' })
            .toBuffer();
          compositeInputs.push({
            input: overlayBuffer,
            gravity: 'center',
          });
        }

        await base.composite(compositeInputs).png().toFile(slidePath);
      }

      // 5. Emit progress 40%
      await this.redis.emitProgress(contentItemId, 40, 'Slides composited');
      await this.prisma.renderJob.updateMany({
        where: { contentItemId, jobType: JOB_TYPE.CAROUSEL_RENDER },
        data: { progress: 40 },
      });

      // 6. Encode carousel video
      const carouselOutputPath = `${tmpDir}/carousel.mp4`;
      await this.carouselEncoder.encode(slidePaths, carouselOutputPath, 3);

      // 7. Emit progress 90%
      await this.redis.emitProgress(contentItemId, 90, 'Encoding complete');
      await this.prisma.renderJob.updateMany({
        where: { contentItemId, jobType: JOB_TYPE.CAROUSEL_RENDER },
        data: { progress: 90 },
      });

      // 8. Upload carousel to S3
      const renderedS3Key = `assets/${contentItemId}/carousel.mp4`;
      await this.s3.upload(carouselOutputPath, renderedS3Key, 'video/mp4');

      // 9. Generate and upload thumbnail
      const thumbnailPath = `${tmpDir}/thumbnail.jpg`;
      await sharp(slidePaths[0])
        .resize(320, 320, { fit: 'cover' })
        .jpeg()
        .toFile(thumbnailPath);
      const thumbnailS3Key = `assets/${contentItemId}/thumbnail.jpg`;
      await this.s3.upload(thumbnailPath, thumbnailS3Key, 'image/jpeg');

      // 10. Emit complete event
      await this.redis.emitComplete(contentItemId, renderedS3Key, thumbnailS3Key);

      // 11. Update ContentItem
      await this.prisma.contentItem.update({
        where: { id: contentItemId },
        data: {
          renderedS3Key,
          thumbnailS3Key,
          status: 'ready',
        },
      });

      // 12. Update RenderJob
      await this.prisma.renderJob.updateMany({
        where: { contentItemId, jobType: JOB_TYPE.CAROUSEL_RENDER },
        data: { status: 'completed', progress: 100, completedAt: new Date() },
      });
    } catch (error) {
      try {
        await this.redis.emitFailed(contentItemId, error.message);
        await this.prisma.renderJob.updateMany({
          where: { contentItemId, jobType: JOB_TYPE.CAROUSEL_RENDER },
          data: { status: 'failed', error: error.message },
        });
        await this.prisma.contentItem.update({
          where: { id: contentItemId },
          data: { status: 'failed' },
        });
      } catch (cleanupError) {
        this.logger.error(
          `Cleanup failed for ${contentItemId}: ${cleanupError.message}`,
        );
      }
      throw error;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }
}
