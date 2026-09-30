import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  REVIEW_MODERATION_STATUSES,
  ReviewStatus,
} from '../constants/review.constants';

export class ModerateReviewDto {
  @ApiProperty({ enum: REVIEW_MODERATION_STATUSES })
  @IsIn(REVIEW_MODERATION_STATUSES)
  status!: ReviewStatus.HIDDEN | ReviewStatus.PUBLISHED;
}
