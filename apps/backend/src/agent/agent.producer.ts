import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/prisma/prisma.service';
import { SOCIAL_QUEUE, JOB_TYPE } from '@app/constants';
import { createDecipheriv } from 'crypto';

/**
 * Dispatches delayed instagram_post jobs to the social queue.
 * Only called when a user approves a scheduled post — the agent itself
 * never dispatches jobs directly.
 */
@Injectable()
export class AgentProducer {
  private readonly logger = new Logger(AgentProducer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(SOCIAL_QUEUE) private readonly socialQueue: Queue,
  ) {}

  /**
   * Dispatch a delayed instagram_post job for an approved scheduled post.
   * Decrypts the Instagram access token before including it in the payload.
   */
  async dispatchInstagramPost(scheduledPostId: string): Promise<void> {
    const post = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      include: { contentItem: true },
    });

    if (!post) {
      this.logger.error(`Scheduled post not found: ${scheduledPostId}`);
      return;
    }

    const igConnection = await this.prisma.instagramConnection.findUnique({
      where: { userId: post.userId },
    });

    if (!igConnection) {
      this.logger.error(`No Instagram connection for user: ${post.userId}`);
      return;
    }

    const accessToken = this.decryptToken(igConnection.accessToken);

    const delay = post.scheduledAt.getTime() - Date.now();

    const payload = {
      jobType: JOB_TYPE.INSTAGRAM_POST,
      scheduledPostId: post.id,
      contentItemId: post.contentItemId,
      renderedS3Key: post.contentItem.renderedS3Key,
      caption: post.caption || '',
      igUserId: igConnection.igUserId,
      accessToken,
    };

    await this.socialQueue.add(JOB_TYPE.INSTAGRAM_POST, payload, {
      delay: Math.max(delay, 0),
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    });

    this.logger.log(
      `Dispatched instagram_post job for post ${scheduledPostId}, delay: ${delay}ms`,
    );
  }

  private decryptToken(ciphertext: string): string {
    const encryptionKey = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    const [ivHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(encryptionKey, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
