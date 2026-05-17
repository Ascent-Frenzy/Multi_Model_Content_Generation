import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../shared/redis/redis.module';
import { REDIS_CHANNELS } from '@app/constants';
import { RenderEvent } from '@app/types';

/**
 * Socket.io gateway that forwards render progress events from Redis pub/sub
 * to connected frontend clients.
 *
 * The worker-renderer publishes events to the `render:events` Redis channel.
 * This gateway subscribes and emits the appropriate Socket.io events.
 */
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' },
  namespace: '/',
})
export class RenderGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RenderGateway.name);
  private subscriber: Redis;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    // Create a dedicated subscriber connection (ioredis requires separate
    // connections for pub/sub)
    this.subscriber = this.redis.duplicate();

    this.subscriber.subscribe(REDIS_CHANNELS.RENDER_EVENTS, (err) => {
      if (err) {
        this.logger.error(
          `Failed to subscribe to ${REDIS_CHANNELS.RENDER_EVENTS}`,
          err,
        );
      } else {
        this.logger.log(
          `Subscribed to Redis channel: ${REDIS_CHANNELS.RENDER_EVENTS}`,
        );
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel !== REDIS_CHANNELS.RENDER_EVENTS) return;

      try {
        const event: RenderEvent = JSON.parse(message);
        this.handleRenderEvent(event);
      } catch (err) {
        this.logger.error('Failed to parse render event', err);
      }
    });
  }

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    // Clients must send their JWT as a query param: ?token=<jwt>
    // We extract userId from it and join a per-user room so events
    // are never broadcast to the wrong user.
    const token = client.handshake.query?.token as string | undefined;
    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token, disconnecting`);
      client.disconnect(true);
      return;
    }
    try {
      const payload = this.jwtService.verify(token, { algorithms: ['HS256'] });
      client.join(`user:${payload.sub}`);
      this.logger.debug(`Client ${client.id} joined room user:${payload.sub}`);
    } catch {
      this.logger.warn(`Client ${client.id} provided invalid token, disconnecting`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe();
      await this.subscriber.quit();
    }
  }

  /** Route render events only to the owning user's room */
  private handleRenderEvent(event: RenderEvent) {
    const room = `user:${event.userId}`;
    switch (event.type) {
      case 'progress':
        this.server.to(room).emit('render:progress', {
          contentItemId: event.contentItemId,
          progress: event.progress,
          stage: event.stage,
        });
        break;

      case 'complete':
        this.server.to(room).emit('render:complete', {
          contentItemId: event.contentItemId,
          renderedS3Key: event.renderedS3Key,
          thumbnailS3Key: event.thumbnailS3Key,
        });
        break;

      case 'failed':
        this.server.to(room).emit('render:failed', {
          contentItemId: event.contentItemId,
          error: event.error,
        });
        break;
    }
  }

  /** Emit agent:scheduled event only to the owning user */
  emitAgentScheduled(payload: {
    userId: string;
    scheduledPostId: string;
    contentItemId: string;
    scheduledAt: string;
  }) {
    this.server.to(`user:${payload.userId}`).emit('agent:scheduled', payload);
  }
}
