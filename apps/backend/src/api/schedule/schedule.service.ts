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
    const post = await this.findAndValidate(id, userId);

    if (post.status !== 'awaiting_approval') {
      throw new BadRequestException(
        `Cannot approve post in status: ${post.status}`,
      );
    }

    // Load the content item to get renderedS3Key
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: post.contentItemId },
    });
    if (!contentItem || !contentItem.renderedS3Key) {
      throw new BadRequestException('Content item has no rendered asset');
    }

    // Load Instagram connection to get access token
    const igConnection = await this.prisma.instagramConnection.findUnique({
      where: { userId },
    });
    if (!igConnection) {
      throw new BadRequestException('No Instagram connection found');
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

    await this.socialQueue.add(JOB_TYPE.INSTAGRAM_POST, payload, {
      delay: Math.max(delay, 0),
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    });

    return this.prisma.scheduledPost.update({
      where: { id },
      data: { status: 'approved' },
    });
  }

  async reschedule(id: string, userId: string, dto: RescheduleDto) {
    const post = await this.findAndValidate(id, userId);

    if (post.status === 'posted' || post.status === 'posting') {
      throw new BadRequestException(
        `Cannot reschedule post in status: ${post.status}`,
      );
    }

    return this.prisma.scheduledPost.update({
      where: { id },
      data: {
        scheduledAt: new Date(dto.scheduledAt),
        ...(dto.caption !== undefined && { caption: dto.caption }),
        status: 'awaiting_approval',
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
