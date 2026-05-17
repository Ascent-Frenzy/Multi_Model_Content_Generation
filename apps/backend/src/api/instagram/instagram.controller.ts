import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { InstagramService } from './instagram.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  getAuthUrl(@Req() req) {
    return this.instagramService.getAuthUrl(req.user.id);
  }

  /** OAuth callback — no auth guard since Instagram redirects here */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.instagramService.handleCallback(code, state);
    return res.redirect(result.redirectUrl);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@Req() req) {
    return this.instagramService.getStatus(req.user.id);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  disconnect(@Req() req) {
    return this.instagramService.disconnect(req.user.id);
  }
}
