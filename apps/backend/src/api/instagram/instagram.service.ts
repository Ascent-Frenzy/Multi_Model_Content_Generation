import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

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

    const url =
      `https://api.instagram.com/oauth/authorize` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=user_profile,user_media` +
      `&response_type=code` +
      `&state=${userId}`;

    return { url };
  }

  /** Handle the OAuth callback — exchange code for token, store encrypted */
  async handleCallback(code: string, state: string) {
    const appId = this.config.getOrThrow<string>('INSTAGRAM_APP_ID');
    const appSecret = this.config.getOrThrow<string>('INSTAGRAM_APP_SECRET');
    const redirectUri = this.config.getOrThrow<string>('INSTAGRAM_REDIRECT_URI');
    const userId = state;

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
        scopes: ['user_profile', 'user_media'],
      },
      create: {
        userId,
        accessToken: encryptedToken,
        igUserId: profileData.id,
        igUsername: profileData.username,
        tokenExpiresAt,
        scopes: ['user_profile', 'user_media'],
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
