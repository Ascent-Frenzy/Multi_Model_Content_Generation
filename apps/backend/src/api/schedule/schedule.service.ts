import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RescheduleDto } from '@app/dtos';
import { SOCIAL_QUEUE, JOB_TYPE } from '@app/constants';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SOCIAL_QUEUE) private readonly socialQueue: Queue,
  ) {}

  async list(userId: string) {
    return this.prisma.scheduledPost.findMany({
      where: { userId },
      include: { contentItem: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /** Approve an agent-queued post and dispatch the delayed instagram_post job */
  async approve(id: string, userId: string) {
    // Atomic status transition: only one concurrent request can win.
    // If two requests race, only one will match the where-clause.
    const { count } = await this.prisma.scheduledPost.updateMany({
      where: { id, userId, status: 'awaiting_approval' },
      data: { status: 'approved' },
    });

    if (count === 0) {
      // Either the post doesn't exist, doesn't belong to user, or is no longer awaiting_approval
      const post = await this.prisma.scheduledPost.findUnique({ where: { id } });
      if (!post) throw new NotFoundException('Scheduled post not found');
      if (post.userId !== userId) throw new ForbiddenException();
      throw new BadRequestException(
        `Cannot approve post in status: ${post.status}`,
      );
    }

    // Re-read the post to get scheduledAt, contentItemId, caption
    const post = await this.prisma.scheduledPost.findUniqueOrThrow({
      where: { id },
    });

    // Load the content item to get renderedS3Key
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: post.contentItemId },
    });
    if (!contentItem || !contentItem.renderedS3Key) {
      // Revert status since we can't proceed
      await this.prisma.scheduledPost.update({
        where: { id },
        data: { status: 'awaiting_approval' },
      });
      throw new BadRequestException('Content item has no rendered asset');
    }

    // Load Instagram connection to get access token
    const igConnection = await this.prisma.instagramConnection.findUnique({
      where: { userId },
    });
    if (!igConnection) {
      await this.prisma.scheduledPost.update({
        where: { id },
        data: { status: 'awaiting_approval' },
      });
      throw new BadRequestException('No Instagram connection found');
    }

    // Check token expiry before dispatching
    if (igConnection.tokenExpiresAt < new Date()) {
      await this.prisma.scheduledPost.update({
        where: { id },
        data: { status: 'awaiting_approval' },
      });
      throw new BadRequestException(
        'Instagram token has expired — please reconnect your account',
      );
    }

    const delay = post.scheduledAt.getTime() - Date.now();

    const payload = {
      jobType: JOB_TYPE.INSTAGRAM_POST,
      scheduledPostId: id,
      contentItemId: post.contentItemId,
      renderedS3Key: contentItem.renderedS3Key,
      caption: post.caption || '',
      igUserId: igConnection.igUserId,
      encryptedAccessToken: igConnection.accessToken,
    };

    try {
      const bullJob = await this.socialQueue.add(JOB_TYPE.INSTAGRAM_POST, payload, {
        delay: Math.max(delay, 0),
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      });

      // Store the BullMQ job ID for later cancellation
      return this.prisma.scheduledPost.update({
        where: { id },
        data: { instagramPostId: bullJob.id },
      });
    } catch (error) {
      // Revert status if enqueue fails
      await this.prisma.scheduledPost.update({
        where: { id },
        data: { status: 'awaiting_approval', instagramPostId: null },
      });
      throw error;
    }
  }

  async reschedule(id: string, userId: string, dto: RescheduleDto) {
    const post = await this.findAndValidate(id, userId);

    if (post.status === 'posted' || post.status === 'posting') {
      throw new BadRequestException(
        `Cannot reschedule post in status: ${post.status}`,
      );
    }

    // Cancel the existing BullMQ job if one was dispatched
    if (post.status === 'approved' && post.instagramPostId) {
      try {
        const existingJob = await this.socialQueue.getJob(post.instagramPostId);
        if (existingJob) {
          await existingJob.remove();
        }
      } catch {
        // Best-effort removal — log and continue
      }
    }

    return this.prisma.scheduledPost.update({
      where: { id },
      data: {
        scheduledAt: new Date(dto.scheduledAt),
        ...(dto.caption !== undefined && { caption: dto.caption }),
        status: 'awaiting_approval',
        instagramPostId: null,  // clear the stored BullMQ job ID
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findAndValidate(id, userId);
    await this.prisma.scheduledPost.delete({ where: { id } });
    return { deleted: true };
  }

  private async findAndValidate(id: string, userId: string) {
    const post = await this.prisma.scheduledPost.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException();
    }

    return post;
  }

}
