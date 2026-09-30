import { ApiProperty } from '@nestjs/swagger';
import {
  REVIEW_RATING_MAX_VALUE,
  REVIEW_RATING_MIN_VALUE,
  ReviewStatus,
} from '../constants/review.constants';
import { ReviewImageResponseDto } from './review-image-response.dto';

export class ReviewResponseDto {
  @ApiProperty({ example: 'A helpful review of the tour.' })
  body!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ isArray: true, type: ReviewImageResponseDto })
  images!: ReviewImageResponseDto[];

  @ApiProperty({
    example: 5,
    maximum: REVIEW_RATING_MAX_VALUE,
    minimum: REVIEW_RATING_MIN_VALUE,
  })
  rating!: number;

  @ApiProperty({ enum: ReviewStatus })
  status!: ReviewStatus;

  @ApiProperty({ format: 'uuid' })
  tourId!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
