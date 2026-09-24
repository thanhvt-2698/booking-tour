import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { TourStatus } from '../constants/tour.constants';

export class UpdateTourDto {
  @ApiPropertyOptional({ example: 1500000, minimum: 0, type: Number })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  basePrice?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'DN-001', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @ApiPropertyOptional({
    example: 'Khám phá biển miền Trung',
    maxLength: 20_000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20_000)
  description?: string;

  @ApiPropertyOptional({ example: 'da-nang-beach-tour', maxLength: 180 })
  @IsOptional()
  @IsString()
  @Length(1, 180)
  slug?: string;

  @ApiPropertyOptional({ enum: TourStatus })
  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;

  @ApiPropertyOptional({ example: 'Tour Đà Nẵng', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ApiPropertyOptional({ example: 'VND', minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
