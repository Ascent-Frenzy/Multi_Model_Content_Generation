import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../shared/prisma/prisma.service';
import { AgentService } from './agent.service';
import { RenderGateway } from '../api/gateway/render.gateway';

/**
 * Hourly cron that runs the autonomous scheduling agent.
 *
 * For each user with ready content, it:
 * 1. Calls AgentService to get Claude's scheduling decisions
 * 2. Creates ScheduledPost rows with status = awaiting_approval
 * 3. Emits agent:scheduled WebSocket events
 *
 * The agent NEVER dispatches instagram_post jobs — that only happens
 * when the user approves via PATCH /schedule/:id/approve.
 */
@Injectable()
export class AgentScheduler {
  private readonly logger = new Logger(AgentScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
    private readonly renderGateway: RenderGateway,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Agent scheduler running...');

    try {
      // Get all users who have ready content
      const usersWithContent = await this.prisma.user.findMany({
        where: {
          contentItems: {
            some: {
              status: 'ready',
            },
          },
        },
        select: { id: true },
      });

      for (const user of usersWithContent) {
        await this.processUser(user.id);
      }

      this.logger.log(
        `Agent scheduler completed for ${usersWithContent.length} users`,
      );
    } catch (error) {
      this.logger.error('Agent scheduler failed', error);
    }
  }

  private async processUser(userId: string) {
    try {
      const decisions =
        await this.agentService.getSchedulingDecisions(userId);

      for (const decision of decisions) {
        // Verify the content item exists and belongs to this user
        const contentItem = await this.prisma.contentItem.findFirst({
          where: { id: decision.contentItemId, userId },
        });

        if (!contentItem) {
          this.logger.warn(
            `Agent suggested non-existent content: ${decision.contentItemId}`,
          );
          continue;
        }

        // Create the scheduled post
        const scheduledPost = await this.prisma.scheduledPost.create({
          data: {
            contentItemId: decision.contentItemId,
            userId,
            platform: 'instagram',
            scheduledAt: new Date(decision.scheduledAt),
            status: 'awaiting_approval',
            caption: decision.caption,
            agentReasoning: decision.reasoning,
          },
        });

        // Emit WebSocket event only to the owning user's room
        this.renderGateway.emitAgentScheduled({
          userId,
          scheduledPostId: scheduledPost.id,
          contentItemId: decision.contentItemId,
          scheduledAt: scheduledPost.scheduledAt.toISOString(),
        });

        this.logger.log(
          `Created scheduled post ${scheduledPost.id} for content ${decision.contentItemId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Agent failed for user ${userId}`, error);
    }
  }
}
