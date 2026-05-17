import { Module } from '@nestjs/common';
import { FfmpegService } from './ffmpeg.service';
import { CarouselEncoder } from './carousel-encoder';
import { ReelEncoder } from './reel-encoder';

@Module({
  providers: [FfmpegService, CarouselEncoder, ReelEncoder],
  exports: [FfmpegService, CarouselEncoder, ReelEncoder],
})
export class FfmpegModule {}
