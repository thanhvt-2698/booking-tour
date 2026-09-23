import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CategoryStatus } from '../constants/category.constants';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'beach-tour' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 100, example: 'Du lịch biển' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ enum: CategoryStatus })
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}
