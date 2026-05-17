import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class FfmpegService {
  constructor() {
    const ffmpegPath =
      process.env.FFMPEG_PATH || require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
  }

  createCommand(): ffmpeg.FfmpegCommand {
    return ffmpeg();
  }

  runCommand(command: ffmpeg.FfmpegCommand): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      command
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  extractFrame(
    videoPath: string,
    outputPath: string,
    timestampSecs: number = 0,
  ): Promise<void> {
    const command = this.createCommand();
    command
      .input(videoPath)
      .inputOptions(['-ss', String(timestampSecs)])
      .outputOptions(['-frames:v', '1', '-q:v', '2'])
      .output(outputPath);
    return this.runCommand(command);
  }
}
