import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import sharp from 'sharp';
import axios from 'axios';
import { promises as fs } from 'fs';
import { ReelRenderJob } from '@app/types';
import { JOB_TYPE } from '@app/constants';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';
import { S3Service } from '../../s3/s3.service';
import { FluxService } from '../../flux/flux.service';
import { ElevenLabsService } from '../../elevenlabs/elevenlabs.service';
import { ReelEncoder } from '../../ffmpeg/reel-encoder';
import { FfmpegService } from '../../ffmpeg/ffmpeg.service';

@Injectable()
export class ReelHandler {
  private readonly logger = new Logger(ReelHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly s3: S3Service,
    private readonly fluxService: FluxService,
    private readonly elevenLabsService: ElevenLabsService,
    private readonly reelEncoder: ReelEncoder,
    private readonly ffmpegService: FfmpegService,
  ) {}

  async handle(job: Job<ReelRenderJob>): Promise<void> {
    const { contentItemId, script, voiceId, segments, dimensions } = job.data;
    const { width, height } = dimensions;

    const tmpDir = `/tmp/${contentItemId}`;
    await fs.mkdir(tmpDir, { recursive: true });

    try {
      // 1. Emit progress 5%
      await this.redis.emitProgress(contentItemId, 5, 'Job started');
      await this.prisma.renderJob.updateMany({
        where: { contentItemId, jobType: JOB_TYPE.REEL_RENDER },
        data: { status: 'processing', progress: 5 },
      });

      // 2. Parallel phase: voiceover + flux images + existing asset downloads
      const voiceoverPath = `${tmpDir}/voiceover.mp3`;

      const generateVoiceover = async (): Promise<void> => {
        const buffer = await this.elevenLabsService.generateSpeech(
          script,
          voiceId,
        );
        await fs.writeFile(voiceoverPath, buffer);
        await this.s3.upload(
          voiceoverPath,
          `assets/${contentItemId}/voiceover.mp3`,
          'audio/mpeg',
        );
        await this.redis.emitProgress(
          contentItemId,
          40,
          'Voiceover generated',
        );
      };

      const generateFluxImages = async (): Promise<void> => {
        for (const seg of segments) {
          if (seg.type === 'flux_image' && seg.fluxPrompt) {
            const imageUrl = await this.fluxService.generateImage(
              seg.fluxPrompt,
              width,
              height,
            );
            const response = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
            });
            const localPath = `${tmpDir}/flux-${seg.order}.png`;
            await fs.writeFile(localPath, response.data);
            await this.s3.upload(
              localPath,
              `assets/${contentItemId}/flux-${seg.order}.png`,
              'image/png',
            );
          }
        }
      };

      const downloadExistingAssets = async (): Promise<void> => {
        const downloadPromises: Promise<void>[] = [];
        for (const seg of segments) {
          if (
            (seg.type === 'clip' || seg.type === 'static_image') &&
            seg.assetS3Key
          ) {
            const ext = seg.type === 'clip' ? 'mp4' : 'png';
            downloadPromises.push(
              this.s3.download(
                seg.assetS3Key,
                `${tmpDir}/segment-${seg.order}.${ext}`,
              ),
            );
          }
        }
        await Promise.all(downloadPromises);
      };

      await Promise.all([
        generateVoiceover(),
        generateFluxImages(),
        downloadExistingAssets(),
      ]);

      // 3. Emit progress 70%
      await this.redis.emitProgress(
        contentItemId,
        70,
        'All assets generated and downloaded',
      );

      // 4. Build encoder segment list
      const encoderSegments = segments
        .sort((a, b) => a.order - b.order)
        .map((seg) => {
          let path: string;
          let type: 'video' | 'image';
          if (seg.type === 'clip') {
            path = `${tmpDir}/segment-${seg.order}.mp4`;
            type = 'video';
          } else if (seg.type === 'flux_image') {
            path = `${tmpDir}/flux-${seg.order}.png`;
            type = 'image';
          } else {
            path = `${tmpDir}/segment-${seg.order}.png`;
            type = 'image';
          }
          const durationSecs = seg.endSec - seg.startSec;
          return { path, durationSecs, type, caption: seg.caption };
        });

      // 5. Encode reel
      const reelOutputPath = `${tmpDir}/reel.mp4`;
      await this.reelEncoder.encode({
        segments: encoderSegments,
        voiceoverPath,
        outputPath: reelOutputPath,
        width,
        height,
      });

      // 6. Emit progress 90%
      await this.redis.emitProgress(contentItemId, 90, 'Encoding complete');
      await this.prisma.renderJob.updateMany({
        where: { contentItemId, jobType: JOB_TYPE.REEL_RENDER },
        data: { progress: 90 },
      });

      // 7. Upload reel to S3
      const renderedS3Key = `assets/${contentItemId}/reel.mp4`;
      await this.s3.upload(reelOutputPath, renderedS3Key, 'video/mp4');

      // 8. Generate thumbnail
      const thumbnailPath = `${tmpDir}/thumbnail.jpg`;
      const firstSeg = encoderSegments[0];
      if (firstSeg.type === 'video') {
        const framePath = `${tmpDir}/frame-0.png`;
        await this.ffmpegService.extractFrame(firstSeg.path, framePath, 0);
        await sharp(framePath)
          .resize(320, 568, { fit: 'cover' })
          .jpeg()
          .toFile(thumbnailPath);
      } else {
        await sharp(firstSeg.path)
          .resize(320, 568, { fit: 'cover' })
          .jpeg()
          .toFile(thumbnailPath);
      }

      // 9. Upload thumbnail
      const thumbnailS3Key = `assets/${contentItemId}/thumbnail.jpg`;
      await this.s3.upload(thumbnailPath, thumbnailS3Key, 'image/jpeg');

      // 10. Emit complete event
      await this.redis.emitComplete(
        contentItemId,
        renderedS3Key,
        thumbnailS3Key,
      );

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
        where: { contentItemId, jobType: JOB_TYPE.REEL_RENDER },
        data: { status: 'completed', progress: 100, completedAt: new Date() },
      });
    } catch (error) {
      try {
        await this.redis.emitFailed(contentItemId, error.message);
        await this.prisma.renderJob.updateMany({
          where: { contentItemId, jobType: JOB_TYPE.REEL_RENDER },
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
