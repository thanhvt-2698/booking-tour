import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_RATING_MAX_VALUE,
  REVIEW_RATING_MIN_VALUE,
} from '../constants/review.constants';

export class CreateReviewDto {
  @ApiProperty({
    example: 'The guide was knowledgeable and the itinerary was well paced.',
    maxLength: REVIEW_BODY_MAX_LENGTH,
    minLength: REVIEW_BODY_MIN_LENGTH,
  })
  @IsString()
  @Length(REVIEW_BODY_MIN_LENGTH, REVIEW_BODY_MAX_LENGTH)
  body!: string;

  @ApiProperty({
    example: 5,
    maximum: REVIEW_RATING_MAX_VALUE,
    minimum: REVIEW_RATING_MIN_VALUE,
  })
  @Type(() => Number)
  @IsInt()
  @Max(REVIEW_RATING_MAX_VALUE)
  @Min(REVIEW_RATING_MIN_VALUE)
  rating!: number;
}
