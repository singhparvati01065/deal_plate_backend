import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PromotionType } from '@prisma/client';

export class CreatePromotionDto {
  @IsEnum(PromotionType)
  type: PromotionType;

  @IsOptional() @IsString() @MaxLength(40) category?: string;

  @IsString() @MinLength(2) @MaxLength(140)
  title: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(40) badge?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() flyerPdfUrl?: string;

  @IsISO8601() startDate: string;
  @IsISO8601() endDate: string;
}
