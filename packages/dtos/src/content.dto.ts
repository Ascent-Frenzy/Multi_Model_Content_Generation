import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCarouselDto {
  @IsString()
  topic: string;

  @IsString()
  brandProfileId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  slideCount?: number;
}

export class CreateReelDto {
  @IsString()
  topic: string;

  @IsString()
  brandProfileId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  voiceId?: string;
}

export class SlideUpdateDto {
  @IsInt()
  order: number;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  bgColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  bgImageS3Key?: string;

  @IsOptional()
  @IsString()
  overlayImageS3Key?: string;
}

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  script?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlideUpdateDto)
  slides?: SlideUpdateDto[];

  @IsOptional()
  @IsArray()
  segments?: any[];
}
