import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateTourDto {
  @ApiProperty({ example: 1500000, minimum: 0, type: Number })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  basePrice!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 'DN-001', maxLength: 50 })
  @IsString()
  @Length(1, 50)
  code!: string;

  @ApiProperty({ example: 'Khám phá biển miền Trung', maxLength: 20_000 })
  @IsString()
  @Length(1, 20_000)
  description!: string;

  @ApiPropertyOptional({ example: 'da-nang-beach-tour', maxLength: 180 })
  @IsOptional()
  @IsString()
  @Length(1, 180)
  slug?: string;

  @ApiProperty({ example: 'Tour Đà Nẵng', maxLength: 200 })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({
    default: 'VND',
    example: 'VND',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
