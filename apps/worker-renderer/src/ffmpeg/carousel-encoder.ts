import { Injectable } from '@nestjs/common';
import { FfmpegService } from './ffmpeg.service';

@Injectable()
export class CarouselEncoder {
  constructor(private readonly ffmpegService: FfmpegService) {}

  async encode(
    slidePaths: string[],
    outputPath: string,
    slideDurationSecs: number = 3,
  ): Promise<void> {
    const command = this.ffmpegService.createCommand();

    for (const slidePath of slidePaths) {
      command
        .input(slidePath)
        .inputOptions(['-framerate', '30', '-loop', '1', '-t', String(slideDurationSecs)]);
    }

    const filterInputs = slidePaths.map((_, i) => `[${i}:v]`).join('');
    const concatFilter = `${filterInputs}concat=n=${slidePaths.length}:v=1:a=0[outv]`;

    command
      .complexFilter([concatFilter])
      .outputOptions([
        '-map', '[outv]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-movflags', '+faststart',
      ])
      .output(outputPath);

    return this.ffmpegService.runCommand(command);
  }
}
