import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCarouselDto, CreateReelDto, UpdateContentDto } from '@app/dtos';

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  list(@Req() req) {
    return this.contentService.list(req.user.id);
  }

  @Post('carousel')
  createCarousel(@Req() req, @Body() dto: CreateCarouselDto) {
    return this.contentService.createCarousel(req.user.id, dto);
  }

  @Post('reel')
  createReel(@Req() req, @Body() dto: CreateReelDto) {
    return this.contentService.createReel(req.user.id, dto);
  }

  @Get(':id')
  findById(@Req() req, @Param('id') id: string) {
    return this.contentService.findById(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentService.update(id, req.user.id, dto);
  }

  @Patch(':id/approve-script')
  approveScript(@Req() req, @Param('id') id: string) {
    return this.contentService.approveScript(id, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    return this.contentService.delete(id, req.user.id);
  }
}
