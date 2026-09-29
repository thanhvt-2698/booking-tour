import type { BookingEntity } from '../../bookings/entities/booking.entity';
import type { TourEntity } from '../../tours/entities/tour.entity';
import type { ReviewEntity } from '../entities/review.entity';
import type { CreateReviewRecord } from './create-review-record.interface';

export interface ReviewSubmissionTransaction {
  createReview(input: CreateReviewRecord): Promise<ReviewEntity | null>;
  findEligibleBooking(
    userId: string,
    tourId: string,
  ): Promise<BookingEntity | null>;
  findExistingReview(
    userId: string,
    tourId: string,
  ): Promise<ReviewEntity | null>;
  findTour(tourId: string): Promise<TourEntity | null>;
}
