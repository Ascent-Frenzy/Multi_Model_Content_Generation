import { Injectable } from '@nestjs/common';
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
import { RenderJobHelper } from './render-job.helper';

@Injectable()
export class ReelHandler {
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
    const { userId, contentItemId, script, voiceId, segments, dimensions } = job.data;
    const { width, height } = dimensions;

    const helper = new RenderJobHelper(
      this.prisma,
      this.redis,
      userId,
      contentItemId,
      JOB_TYPE.REEL_RENDER,
    );

    await helper.run(async () => {
      const tmpDir = helper.tmpDir;

      // 1. Start
      await helper.progress(5, 'Job started');

      // 2. Parallel phase: voiceover + flux images + existing asset downloads
      const voiceoverPath = `${tmpDir}/voiceover.mp3`;

      await Promise.all([
        // Generate voiceover
        (async () => {
          const buffer = await this.elevenLabsService.generateSpeech(script, voiceId);
          await fs.writeFile(voiceoverPath, buffer);
          await this.s3.upload(
            voiceoverPath,
            `assets/${contentItemId}/voiceover.mp3`,
            'audio/mpeg',
          );
          await helper.progress(40, 'Voiceover generated');
        })(),

        // Generate Flux images
        (async () => {
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
        })(),

        // Download existing assets
        (async () => {
          const downloads: Promise<void>[] = [];
          for (const seg of segments) {
            if (
              (seg.type === 'clip' || seg.type === 'static_image') &&
              seg.assetS3Key
            ) {
              const ext = seg.type === 'clip' ? 'mp4' : 'png';
              downloads.push(
                this.s3.download(
                  seg.assetS3Key,
                  `${tmpDir}/segment-${seg.order}.${ext}`,
                ),
              );
            }
          }
          await Promise.all(downloads);
        })(),
      ]);

      await helper.progress(70, 'All assets generated and downloaded');

      // 3. Build encoder segment list
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
          return {
            path,
            durationSecs: seg.durationSecs,
            type,
            caption: seg.caption,
          };
        });

      // 4. Encode reel
      const reelOutputPath = `${tmpDir}/reel.mp4`;
      await this.reelEncoder.encode({
        segments: encoderSegments,
        voiceoverPath,
        outputPath: reelOutputPath,
        width,
        height,
      });

      await helper.progress(90, 'Encoding complete');

      // 5. Upload reel to S3
      const renderedS3Key = `assets/${contentItemId}/reel.mp4`;
      await this.s3.upload(reelOutputPath, renderedS3Key, 'video/mp4');

      // 6. Generate + upload thumbnail
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
      const thumbnailS3Key = `assets/${contentItemId}/thumbnail.jpg`;
      await this.s3.upload(thumbnailPath, thumbnailS3Key, 'image/jpeg');

      // 7. Complete
      await helper.complete(renderedS3Key, thumbnailS3Key);
    });
  }
}
