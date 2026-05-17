import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
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
  cors: { origin: '*' },
  namespace: '/',
})
export class RenderGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RenderGateway.name);
  private subscriber: Redis;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

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
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Route render events to the correct Socket.io event name */
  private handleRenderEvent(event: RenderEvent) {
    switch (event.type) {
      case 'progress':
        this.server.emit('render:progress', {
          contentItemId: event.contentItemId,
          progress: event.progress,
          stage: event.stage,
        });
        break;

      case 'complete':
        this.server.emit('render:complete', {
          contentItemId: event.contentItemId,
          renderedS3Key: event.renderedS3Key,
          thumbnailS3Key: event.thumbnailS3Key,
        });
        break;

      case 'failed':
        this.server.emit('render:failed', {
          contentItemId: event.contentItemId,
          error: event.error,
        });
        break;
    }
  }

  /** Emit agent:scheduled event (called by AgentService) */
  emitAgentScheduled(payload: {
    scheduledPostId: string;
    contentItemId: string;
    scheduledAt: string;
  }) {
    this.server.emit('agent:scheduled', payload);
  }
}
