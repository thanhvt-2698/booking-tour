import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_RATING_MAX_VALUE,
  REVIEW_RATING_MIN_VALUE,
} from '../constants/review.constants';
import { MAX_REVIEW_IMAGE_COUNT } from '../../files/constants/file.constants';

export class UpdateReviewDto {
  @ApiPropertyOptional({
    maxLength: REVIEW_BODY_MAX_LENGTH,
    minLength: REVIEW_BODY_MIN_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Length(REVIEW_BODY_MIN_LENGTH, REVIEW_BODY_MAX_LENGTH)
  body?: string;

  @ApiPropertyOptional({
    maximum: REVIEW_RATING_MAX_VALUE,
    minimum: REVIEW_RATING_MIN_VALUE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(REVIEW_RATING_MAX_VALUE)
  @Min(REVIEW_RATING_MIN_VALUE)
  rating?: number;

  @ApiPropertyOptional({
    description:
      'Image IDs to remove. In multipart requests, send a JSON array string.',
    example: '["6a31068a-3336-4d9a-9015-6a61b670873a"]',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REVIEW_IMAGE_COUNT)
  @IsUUID('4', { each: true })
  removeImageIds?: string[];
}
