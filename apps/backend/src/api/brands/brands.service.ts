import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { S3Service } from '../../shared/s3/s3.service';
import {
  CreateBrandProfileDto,
  UpdateBrandProfileDto,
  ConfirmAssetDto,
} from '@app/dtos';
import { AssetType, Tone } from '@prisma/client';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async list(userId: string) {
    return this.prisma.brandProfile.findMany({
      where: { userId },
      include: { assets: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { id },
      include: { assets: true },
    });

    if (!brand) {
      throw new NotFoundException('Brand profile not found');
    }
    if (brand.userId !== userId) {
      throw new ForbiddenException();
    }

    return brand;
  }

  async create(userId: string, dto: CreateBrandProfileDto) {
    return this.prisma.brandProfile.create({
      data: {
        userId,
        name: dto.name,
        tone: dto.tone as Tone,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        fontFamily: dto.fontFamily,
        logoS3Key: dto.logoS3Key,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateBrandProfileDto) {
    await this.findById(id, userId);

    return this.prisma.brandProfile.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.tone !== undefined && { tone: dto.tone as Tone }),
        ...(dto.primaryColor !== undefined && {
          primaryColor: dto.primaryColor,
        }),
        ...(dto.secondaryColor !== undefined && {
          secondaryColor: dto.secondaryColor,
        }),
        ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.logoS3Key !== undefined && { logoS3Key: dto.logoS3Key }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);
    await this.prisma.brandProfile.delete({ where: { id } });
    return { deleted: true };
  }

  /** Issue a presigned S3 URL for direct client upload */
  async getUploadUrl(brandId: string, userId: string, type: string) {
    await this.findById(brandId, userId);

    const extensionMap: Record<string, string> = {
      clip: 'mp4',
      image: 'png',
      audio: 'mp3',
    };
    const mimeMap: Record<string, string> = {
      clip: 'video/mp4',
      image: 'image/png',
      audio: 'audio/mpeg',
    };

    const prefix = `brands/${brandId}/${type}s`;
    return this.s3.getPresignedUploadUrl(
      prefix,
      mimeMap[type] || 'application/octet-stream',
      extensionMap[type] || 'bin',
    );
  }

  /** Confirm an upload and create a BrandAsset record */
  async confirmAsset(brandId: string, userId: string, dto: ConfirmAssetDto) {
    await this.findById(brandId, userId);

    return this.prisma.brandAsset.create({
      data: {
        brandProfileId: brandId,
        type: dto.type as AssetType,
        s3Key: dto.s3Key,
        filename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        durationSecs: dto.durationSecs,
      },
    });
  }

  async listAssets(brandId: string, userId: string) {
    await this.findById(brandId, userId);

    return this.prisma.brandAsset.findMany({
      where: { brandProfileId: brandId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAsset(brandId: string, assetId: string, userId: string) {
    await this.findById(brandId, userId);

    const asset = await this.prisma.brandAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.brandProfileId !== brandId) {
      throw new NotFoundException('Asset not found');
    }

    await this.s3.deleteObject(asset.s3Key);
    await this.prisma.brandAsset.delete({ where: { id: assetId } });

    return { deleted: true };
  }
}
