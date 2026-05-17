import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateBrandProfileDto,
  UpdateBrandProfileDto,
  ConfirmAssetDto,
} from '@app/dtos';

@Controller('brands')
@UseGuards(JwtAuthGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  list(@Req() req) {
    return this.brandsService.list(req.user.id);
  }

  @Post()
  create(@Req() req, @Body() dto: CreateBrandProfileDto) {
    return this.brandsService.create(req.user.id, dto);
  }

  @Get(':id')
  findById(@Req() req, @Param('id') id: string) {
    return this.brandsService.findById(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateBrandProfileDto,
  ) {
    return this.brandsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    return this.brandsService.delete(id, req.user.id);
  }

  @Get(':id/upload-url')
  getUploadUrl(
    @Req() req,
    @Param('id') id: string,
    @Query('type') type: string,
  ) {
    return this.brandsService.getUploadUrl(id, req.user.id, type);
  }

  @Post(':id/assets/confirm')
  confirmAsset(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: ConfirmAssetDto,
  ) {
    return this.brandsService.confirmAsset(id, req.user.id, dto);
  }

  @Get(':id/assets')
  listAssets(@Req() req, @Param('id') id: string) {
    return this.brandsService.listAssets(id, req.user.id);
  }

  @Delete(':id/assets/:assetId')
  deleteAsset(
    @Req() req,
    @Param('id') id: string,
    @Param('assetId') assetId: string,
  ) {
    return this.brandsService.deleteAsset(id, assetId, req.user.id);
  }
}
