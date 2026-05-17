import { Injectable } from '@nestjs/common';
import axios from 'axios';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export interface InstagramPublishOptions {
  igUserId: string;
  accessToken: string;
  mediaUrl: string;
  caption: string;
  mediaType: 'VIDEO' | 'IMAGE';
}

@Injectable()
export class InstagramService {
  async publish(options: InstagramPublishOptions): Promise<string> {
    const { igUserId, accessToken, mediaUrl, caption, mediaType } = options;

    // Step 1: Create media container
    const containerPayload: Record<string, string> = {
      caption,
      access_token: accessToken,
    };

    if (mediaType === 'VIDEO') {
      containerPayload.video_url = mediaUrl;
      containerPayload.media_type = 'REELS';
    } else {
      containerPayload.image_url = mediaUrl;
    }

    const containerResponse = await axios.post(
      `${GRAPH_API_BASE}/${igUserId}/media`,
      containerPayload,
    );

    const creationId: string = containerResponse.data.id;

    // Step 2: For VIDEO, poll until container is ready
    if (mediaType === 'VIDEO') {
      await this.waitForContainerReady(creationId, accessToken);
    }

    // Step 3: Publish
    const publishResponse = await axios.post(
      `${GRAPH_API_BASE}/${igUserId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      },
    );

    return publishResponse.data.id;
  }

  private async waitForContainerReady(
    creationId: string,
    accessToken: string,
  ): Promise<void> {
    const maxAttempts = 60;
    const intervalMs = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await axios.get(
        `${GRAPH_API_BASE}/${creationId}`,
        {
          params: {
            fields: 'status_code',
            access_token: accessToken,
          },
        },
      );

      const statusCode: string = response.data.status_code;

      if (statusCode === 'FINISHED') {
        return;
      }

      if (statusCode === 'ERROR') {
        throw new Error(
          `Instagram media container ${creationId} failed with status ERROR`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Instagram media container ${creationId} timed out after ${maxAttempts} attempts`,
    );
  }
}
