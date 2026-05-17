import { Injectable } from '@nestjs/common';
import { FfmpegService } from './ffmpeg.service';

export interface ReelEncodeOptions {
  segments: Array<{
    path: string;
    durationSecs: number;
    type: 'video' | 'image';
    caption?: string;
  }>;
  voiceoverPath: string;
  outputPath: string;
  width: number;
  height: number;
}

@Injectable()
export class ReelEncoder {
  constructor(private readonly ffmpegService: FfmpegService) {}

  async encode(options: ReelEncodeOptions): Promise<void> {
    const { segments, voiceoverPath, outputPath, width, height } = options;
    const command = this.ffmpegService.createCommand();

    // Add segment inputs
    for (const segment of segments) {
      if (segment.type === 'image') {
        command
          .input(segment.path)
          .inputOptions(['-loop', '1', '-t', String(segment.durationSecs)]);
      } else {
        command
          .input(segment.path)
          .inputOptions(['-t', String(segment.durationSecs)]);
      }
    }

    // Add voiceover input last
    const voiceoverIdx = segments.length;
    command.input(voiceoverPath);

    // Build filtergraph
    const filterChain: string[] = [];
    const concatInputs: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      let currentLabel = `[${i}:v]`;
      let outputLabel: string;

      if (segment.type === 'video') {
        // Trim video, then scale
        const trimLabel = `[v${i}trim]`;
        filterChain.push(
          `${currentLabel}trim=duration=${segment.durationSecs},setpts=PTS-STARTPTS${trimLabel}`,
        );
        currentLabel = trimLabel;
      }

      // Scale, pad, and set SAR
      const scaleLabel = `[v${i}scaled]`;
      filterChain.push(
        `${currentLabel}scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1${scaleLabel}`,
      );
      currentLabel = scaleLabel;

      // Draw caption text if present
      if (segment.caption) {
        const escapedCaption = segment.caption
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "'\\\\\\''")
          .replace(/:/g, '\\:');
        const captionLabel = `[v${i}cap]`;
        filterChain.push(
          `${currentLabel}drawtext=text='${escapedCaption}':` +
            `fontsize=48:fontcolor=white:` +
            `x=(w-text_w)/2:y=h-th-100:` +
            `box=1:boxcolor=black@0.5:boxborderw=10${captionLabel}`,
        );
        outputLabel = captionLabel;
      } else {
        outputLabel = currentLabel;
      }

      concatInputs.push(outputLabel);
    }

    // Concat all segments
    const concatFilter =
      `${concatInputs.join('')}concat=n=${segments.length}:v=1:a=0[outv]`;
    filterChain.push(concatFilter);

    command
      .complexFilter(filterChain)
      .outputOptions([
        '-map', '[outv]',
        '-map', `${voiceoverIdx}:a`,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-shortest',
      ])
      .output(outputPath);

    return this.ffmpegService.runCommand(command);
  }
}
