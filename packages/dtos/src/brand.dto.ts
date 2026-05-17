import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsInt,
} from 'class-validator';
import { Tone, AssetType } from '@app/types';

export class CreateBrandProfileDto {
  @IsString()
  name: string;

  @IsEnum(['professional', 'casual', 'humorous', 'inspirational'])
  tone: Tone;

  @IsString()
  primaryColor: string;

  @IsString()
  secondaryColor: string;

  @IsString()
  fontFamily: string;

  @IsOptional()
  @IsString()
  logoS3Key?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateBrandProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['professional', 'casual', 'humorous', 'inspirational'])
  tone?: Tone;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsString()
  logoS3Key?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class GetUploadUrlDto {
  @IsEnum(['clip', 'image', 'audio'])
  type: AssetType;
}

export class ConfirmAssetDto {
  @IsString()
  s3Key: string;

  @IsString()
  filename: string;

  @IsEnum(['clip', 'image', 'audio'])
  type: AssetType;

  @IsString()
  mimeType: string;

  @IsInt()
  sizeBytes: number;

  @IsOptional()
  @IsNumber()
  durationSecs?: number;
}
