import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

@Injectable()
export class InstagramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Build the Instagram OAuth authorization URL */
  getAuthUrl(userId: string): { url: string } {
    const appId = this.config.getOrThrow<string>('INSTAGRAM_APP_ID');
    const redirectUri = this.config.getOrThrow<string>('INSTAGRAM_REDIRECT_URI');
    const secret = this.config.getOrThrow<string>('JWT_SECRET');

    const timestamp = Date.now().toString();
    const hmac = createHmac('sha256', secret)
      .update(`${userId}:${timestamp}`)
      .digest('hex');
    const state = `${userId}:${timestamp}:${hmac}`;

    const url =
      `https://api.instagram.com/oauth/authorize` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=instagram_basic,instagram_content_publish,pages_read_engagement` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}`;

    return { url };
  }

  /** Handle the OAuth callback — exchange code for token, store encrypted */
  async handleCallback(code: string, state: string) {
    const appId = this.config.getOrThrow<string>('INSTAGRAM_APP_ID');
    const appSecret = this.config.getOrThrow<string>('INSTAGRAM_APP_SECRET');
    const redirectUri = this.config.getOrThrow<string>('INSTAGRAM_REDIRECT_URI');
    const secret = this.config.getOrThrow<string>('JWT_SECRET');

    // Verify HMAC-signed state to prevent CSRF
    const parts = state.split(':');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid OAuth state');
    }
    const [userId, timestamp, receivedHmac] = parts;

    // Reject states older than 10 minutes
    if (Date.now() - parseInt(timestamp, 10) > 600_000) {
      throw new BadRequestException('OAuth state expired');
    }

    const expectedHmac = createHmac('sha256', secret)
      .update(`${userId}:${timestamp}`)
      .digest('hex');

    if (receivedHmac !== expectedHmac) {
      throw new BadRequestException('Invalid OAuth state signature');
    }

    // Exchange code for short-lived token
    const tokenResponse = await fetch(
      'https://api.instagram.com/oauth/access_token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new BadRequestException('Failed to exchange Instagram auth code');
    }

    const tokenData = await tokenResponse.json();

    // Exchange for long-lived token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token` +
        `?grant_type=ig_exchange_token` +
        `&client_secret=${appSecret}` +
        `&access_token=${tokenData.access_token}`,
    );

    if (!longLivedResponse.ok) {
      throw new BadRequestException(
        'Failed to exchange for long-lived Instagram token',
      );
    }

    const longLivedData = await longLivedResponse.json();

    // Get user profile
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${longLivedData.access_token}`,
    );
    if (!profileResponse.ok) {
      throw new BadRequestException('Failed to fetch Instagram profile');
    }
    const profileData = await profileResponse.json();

    // Encrypt the access token before storing
    const encryptedToken = this.encrypt(longLivedData.access_token);

    // Calculate token expiry (long-lived tokens last 60 days)
    const tokenExpiresAt = new Date(
      Date.now() + (longLivedData.expires_in || 5184000) * 1000,
    );

    // Upsert the Instagram connection
    await this.prisma.instagramConnection.upsert({
      where: { userId },
      update: {
        accessToken: encryptedToken,
        igUserId: profileData.id,
        igUsername: profileData.username,
        tokenExpiresAt,
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
      },
      create: {
        userId,
        accessToken: encryptedToken,
        igUserId: profileData.id,
        igUsername: profileData.username,
        tokenExpiresAt,
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
      },
    });

    // Redirect to frontend
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    return { redirectUrl: `${frontendUrl}/settings/instagram?connected=true` };
  }

  /** Get connection status for the current user */
  async getStatus(userId: string) {
    const connection = await this.prisma.instagramConnection.findUnique({
      where: { userId },
      select: {
        igUsername: true,
        igUserId: true,
        tokenExpiresAt: true,
        scopes: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      username: connection.igUsername,
      igUserId: connection.igUserId,
      tokenExpiresAt: connection.tokenExpiresAt,
      scopes: connection.scopes,
    };
  }

  /** Disconnect Instagram — delete the stored connection */
  async disconnect(userId: string) {
    const connection = await this.prisma.instagramConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new NotFoundException('No Instagram connection found');
    }

    await this.prisma.instagramConnection.delete({ where: { userId } });
    return { disconnected: true };
  }

  /** Encrypt a token using AES-256-CBC */
  encrypt(token: string): string {
    const key = Buffer.from(
      this.config.getOrThrow<string>('ENCRYPTION_KEY'),
      'hex',
    );
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /** Decrypt a token using AES-256-CBC */
  decrypt(ciphertext: string): string {
    const key = Buffer.from(
      this.config.getOrThrow<string>('ENCRYPTION_KEY'),
      'hex',
    );
    const [ivHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
