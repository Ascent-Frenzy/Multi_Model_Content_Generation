import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCarouselDto, CreateReelDto, UpdateContentDto } from '@app/dtos';
import { RENDER_QUEUE, SOCIAL_QUEUE, JOB_TYPE, DIMENSIONS } from '@app/constants';
import { CarouselSlide, ReelSegmentDB, ReelSegment } from '@app/types';

function extractJson(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}

@Injectable()
export class ContentService {
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(RENDER_QUEUE) private readonly renderQueue: Queue,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async list(userId: string) {
    return this.prisma.contentItem.findMany({
      where: { userId },
      include: { carouselDetail: true, reelDetail: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id },
      include: {
        carouselDetail: true,
        reelDetail: true,
        renderJobs: true,
        scheduledPosts: true,
        brandProfile: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Content item not found');
    }
    if (item.userId !== userId) {
      throw new ForbiddenException();
    }

    return item;
  }

  /** Generate a carousel: call Claude for slide content, save to DB */
  async createCarousel(userId: string, dto: CreateCarouselDto) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { id: dto.brandProfileId },
    });
    if (!brand || brand.userId !== userId) {
      throw new NotFoundException('Brand profile not found');
    }

    const slideCount = dto.slideCount ?? 5;
    const title = dto.title || dto.topic;

    // Create content item in script_pending state
    const contentItem = await this.prisma.contentItem.create({
      data: {
        userId,
        brandProfileId: dto.brandProfileId,
        type: 'carousel',
        title,
        topic: dto.topic,
        status: 'script_pending',
      },
    });

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `Generate a ${slideCount}-slide carousel about: "${dto.topic}".
Brand tone: ${brand.tone}. Primary color: ${brand.primaryColor}.
Return JSON: { "slides": [{ "order": number, "headline": string, "body": string, "textColor": string, "bgColor": string }] }
Return ONLY valid JSON, no markdown or explanation.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      let parsed: { slides: CarouselSlide[] };
      try {
        parsed = JSON.parse(extractJson(textBlock.text));
      } catch {
        // Set status to failed if Claude returns invalid JSON
        await this.prisma.contentItem.update({
          where: { id: contentItem.id },
          data: { status: 'failed' },
        });
        throw new UnprocessableEntityException(
          'Claude returned invalid JSON for carousel slides',
        );
      }

      // Validate slides array
      if (!parsed.slides || !Array.isArray(parsed.slides)) {
        await this.prisma.contentItem.update({
          where: { id: contentItem.id },
          data: { status: 'failed' },
        });
        throw new UnprocessableEntityException(
          'Claude response missing slides array',
        );
      }

      // Save carousel detail
      const carouselDetail = await this.prisma.carouselDetail.create({
        data: {
          contentItemId: contentItem.id,
          slideCount: parsed.slides.length,
          slides: parsed.slides as any,
        },
      });

      // Build script from slide content
      const script = parsed.slides
        .map((s) => `[Slide ${s.order}] ${s.headline}: ${s.body}`)
        .join('\n');

      await this.prisma.contentItem.update({
        where: { id: contentItem.id },
        data: { script },
      });

      return {
        ...contentItem,
        script,
        carouselDetail,
      };
    } catch (error) {
      if (
        error instanceof UnprocessableEntityException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      await this.prisma.contentItem.update({
        where: { id: contentItem.id },
        data: { status: 'failed' },
      });
      throw new UnprocessableEntityException(
        `Failed to generate carousel: ${error.message}`,
      );
    }
  }

  /** Generate a reel: call Claude for script + segment plan */
  async createReel(userId: string, dto: CreateReelDto) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { id: dto.brandProfileId },
    });
    if (!brand || brand.userId !== userId) {
      throw new NotFoundException('Brand profile not found');
    }

    const title = dto.title || dto.topic;

    const contentItem = await this.prisma.contentItem.create({
      data: {
        userId,
        brandProfileId: dto.brandProfileId,
        type: 'reel',
        title,
        topic: dto.topic,
        status: 'script_pending',
      },
    });

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `Generate a short-form reel script about: "${dto.topic}".
Brand tone: ${brand.tone}. Target duration: 30-60 seconds.
Return JSON: { "script": string, "segments": [{ "order": number, "type": "clip"|"flux_image"|"static_image", "fluxPrompt": string|null, "startSec": number, "endSec": number, "caption": string }] }
Return ONLY valid JSON, no markdown or explanation.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      let parsed: { script: string; segments: ReelSegmentDB[] };
      try {
        parsed = JSON.parse(extractJson(textBlock.text));
      } catch {
        await this.prisma.contentItem.update({
          where: { id: contentItem.id },
          data: { status: 'failed' },
        });
        throw new UnprocessableEntityException(
          'Claude returned invalid JSON for reel script',
        );
      }

      if (!parsed.script || !parsed.segments) {
        await this.prisma.contentItem.update({
          where: { id: contentItem.id },
          data: { status: 'failed' },
        });
        throw new UnprocessableEntityException(
          'Claude response missing script or segments',
        );
      }

      const totalDuration =
        parsed.segments.length > 0
          ? Math.max(...parsed.segments.map((s) => s.endSec))
          : 0;

      const reelDetail = await this.prisma.reelDetail.create({
        data: {
          contentItemId: contentItem.id,
          durationSecs: totalDuration,
          segments: parsed.segments as any,
        },
      });

      await this.prisma.contentItem.update({
        where: { id: contentItem.id },
        data: { script: parsed.script },
      });

      return {
        ...contentItem,
        script: parsed.script,
        reelDetail,
      };
    } catch (error) {
      if (
        error instanceof UnprocessableEntityException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      await this.prisma.contentItem.update({
        where: { id: contentItem.id },
        data: { status: 'failed' },
      });
      throw new UnprocessableEntityException(
        `Failed to generate reel: ${error.message}`,
      );
    }
  }

  /** Update slides/segments or title */
  async update(id: string, userId: string, dto: UpdateContentDto) {
    const item = await this.findById(id, userId);

    if (dto.title || dto.script) {
      await this.prisma.contentItem.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.script && { script: dto.script }),
        },
      });
    }

    if (dto.slides && item.carouselDetail) {
      await this.prisma.carouselDetail.update({
        where: { id: item.carouselDetail.id },
        data: {
          slides: dto.slides as any,
          slideCount: dto.slides.length,
        },
      });
    }

    if (dto.segments && item.reelDetail) {
      await this.prisma.reelDetail.update({
        where: { id: item.reelDetail.id },
        data: { segments: dto.segments as any },
      });
    }

    return this.findById(id, userId);
  }

  /** Approve script and dispatch render job */
  async approveScript(id: string, userId: string) {
    const item = await this.findById(id, userId);

    if (item.status !== 'script_pending') {
      throw new BadRequestException(
        `Cannot approve script in status: ${item.status}`,
      );
    }

    // Update status to script_approved
    await this.prisma.contentItem.update({
      where: { id },
      data: { status: 'script_approved' },
    });

    // Dispatch render job
    if (item.type === 'carousel' && item.carouselDetail) {
      const payload = {
        jobType: JOB_TYPE.CAROUSEL_RENDER,
        userId,
        contentItemId: id,
        brandProfileId: item.brandProfileId,
        slides: item.carouselDetail.slides,
        outputFormat: 'mp4',
        dimensions: DIMENSIONS.CAROUSEL,
      };

      const bullJob = await this.renderQueue.add(
        JOB_TYPE.CAROUSEL_RENDER,
        payload,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      await this.prisma.renderJob.create({
        data: {
          contentItemId: id,
          queue: 'render',
          jobType: 'carousel_render',
          bullMqJobId: bullJob.id,
          status: 'queued',
        },
      });
    } else if (item.type === 'reel' && item.reelDetail) {
      const dbSegments = item.reelDetail.segments as unknown as ReelSegmentDB[];
      const segments: ReelSegment[] = dbSegments.map((s) => ({
        order: s.order,
        type: s.type,
        assetS3Key: s.assetS3Key,
        fluxPrompt: s.fluxPrompt,
        durationSecs: s.endSec - s.startSec,
        caption: s.caption,
      }));

      const payload = {
        jobType: JOB_TYPE.REEL_RENDER,
        userId,
        contentItemId: id,
        brandProfileId: item.brandProfileId,
        script: item.script,
        voiceId: this.config.get<string>('ELEVENLABS_VOICE_ID') || 'JBFqnCBsd6RMkjVDRZzb',
        segments,
        dimensions: DIMENSIONS.REEL,
      };

      const bullJob = await this.renderQueue.add(
        JOB_TYPE.REEL_RENDER,
        payload,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      await this.prisma.renderJob.create({
        data: {
          contentItemId: id,
          queue: 'render',
          jobType: 'reel_render',
          bullMqJobId: bullJob.id,
          status: 'queued',
        },
      });
    }

    // Update status to generating
    await this.prisma.contentItem.update({
      where: { id },
      data: { status: 'generating' },
    });

    return this.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);
    await this.prisma.contentItem.delete({ where: { id } });
    return { deleted: true };
  }
}
