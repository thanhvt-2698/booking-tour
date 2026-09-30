import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_RATING_MAX_VALUE,
  REVIEW_RATING_MIN_VALUE,
} from '../constants/review.constants';

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
}
