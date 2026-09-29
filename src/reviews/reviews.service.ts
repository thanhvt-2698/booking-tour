import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  REVIEW_BODY_MIN_LENGTH,
  ReviewStatus,
} from './constants/review.constants';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsStore } from './reviews.store';

@Injectable()
export class ReviewsService {
  constructor(private readonly reviewsStore: ReviewsStore) {}

  async create(
    userId: string,
    tourId: string,
    input: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const body = this.normalizeBody(input.body);

    return this.reviewsStore.withinTransaction(async (transaction) => {
      const tour = await transaction.findTour(tourId);

      if (!tour) {
        throw new NotFoundException('errors.tourNotFound');
      }

      const existingReview = await transaction.findExistingReview(
        userId,
        tourId,
      );

      if (existingReview) {
        throw new ConflictException('errors.reviewAlreadyExists');
      }

      const eligibleBooking = await transaction.findEligibleBooking(
        userId,
        tourId,
      );

      if (!eligibleBooking) {
        throw new ConflictException('errors.reviewNotEligible');
      }

      const review = await transaction.createReview({
        bookingId: eligibleBooking.id,
        body,
        rating: input.rating,
        status: ReviewStatus.PUBLISHED,
        tourId,
        userId,
      });

      if (!review) {
        throw new ConflictException('errors.reviewAlreadyExists');
      }

      return this.toResponse(review);
    });
  }

  private normalizeBody(body: string): string {
    const normalizedBody = body.trim();

    if (normalizedBody.length < REVIEW_BODY_MIN_LENGTH) {
      throw new BadRequestException('errors.reviewBodyRequired');
    }

    return normalizedBody;
  }

  private toResponse(review: ReviewEntity): ReviewResponseDto {
    return {
      body: review.body,
      createdAt: review.createdAt,
      id: review.id,
      rating: review.rating,
      status: review.status,
      tourId: review.tourId,
      updatedAt: review.updatedAt,
    };
  }
}
