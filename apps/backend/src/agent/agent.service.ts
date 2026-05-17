import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../shared/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

interface SchedulingDecision {
  contentItemId: string;
  scheduledAt: string;
  caption: string;
  reasoning: string;
}

@Injectable()
export class AgentService {
  private readonly anthropic: Anthropic;
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Core agent logic: analyze content library + engagement data,
   * call Claude to decide what/when to post, return scheduling decisions.
   */
  async getSchedulingDecisions(
    userId: string,
  ): Promise<SchedulingDecision[]> {
    // 1. Query content items that are ready but have no pending scheduled post
    const readyContent = await this.prisma.contentItem.findMany({
      where: {
        userId,
        status: 'ready',
        scheduledPosts: {
          none: {
            status: { notIn: ['failed'] },
          },
        },
      },
      include: {
        brandProfile: true,
        carouselDetail: true,
        reelDetail: true,
      },
    });

    if (readyContent.length === 0) {
      this.logger.debug('No ready content without pending posts');
      return [];
    }

    // 2. Load mock engagement data
    const engagementData = this.loadMockEngagementData();

    // 3. Call Claude for scheduling decisions
    const contentSummary = readyContent.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      topic: item.topic,
      brandTone: item.brandProfile.tone,
      createdAt: item.createdAt.toISOString(),
    }));

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a social media scheduling agent. Given this content library and engagement data, decide what to post and when over the next 3 days.

Content Library:
${JSON.stringify(contentSummary, null, 2)}

Engagement Data (recent performance):
${JSON.stringify(engagementData, null, 2)}

Return JSON array: [{ "contentItemId": string, "scheduledAt": ISO string, "caption": string, "reasoning": string }]
Consider optimal posting times, content variety, and engagement patterns.
Return ONLY valid JSON, no markdown or explanation.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      this.logger.error('No text response from Claude for scheduling');
      return [];
    }

    try {
      const decisions: SchedulingDecision[] = JSON.parse(textBlock.text);
      return decisions;
    } catch {
      this.logger.error('Claude returned invalid JSON for scheduling decisions');
      return [];
    }
  }

  /** Load mock engagement data from the data directory */
  private loadMockEngagementData(): any {
    try {
      const dataPath = path.join(process.cwd(), 'data', 'mock-engagement.json');
      const raw = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      this.logger.warn('Could not load mock engagement data, using defaults');
      return {
        bestPostingHours: [9, 12, 17, 20],
        avgEngagementRate: 0.045,
        topPerformingTypes: ['carousel', 'reel'],
        recentPosts: [],
      };
    }
  }
}
