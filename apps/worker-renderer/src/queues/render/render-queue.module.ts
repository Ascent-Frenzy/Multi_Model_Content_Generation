import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RENDER_QUEUE } from '@app/constants';
import { RenderProcessor } from './render.processor';
import { CarouselHandler } from './carousel-handler';
import { ReelHandler } from './reel-handler';
import { S3Module } from '../../s3/s3.module';
import { FfmpegModule } from '../../ffmpeg/ffmpeg.module';
import { FluxModule } from '../../flux/flux.module';
import { ElevenLabsModule } from '../../elevenlabs/elevenlabs.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: RENDER_QUEUE }),
    S3Module,
    FfmpegModule,
    FluxModule,
    ElevenLabsModule,
  ],
  providers: [RenderProcessor, CarouselHandler, ReelHandler],
})
export class RenderQueueModule {}
