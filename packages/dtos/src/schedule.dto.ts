import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RescheduleDto {
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
