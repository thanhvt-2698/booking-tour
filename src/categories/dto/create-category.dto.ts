import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'beach-tour' })
  @IsOptional()
  @ApiProperty({ maxLength: 100, example: 'Du lịch biển' })
  @IsString()
  @Length(1, 120)
  slug?: string;

  @IsString()
  @Length(1, 100)
  name!: string;
}
