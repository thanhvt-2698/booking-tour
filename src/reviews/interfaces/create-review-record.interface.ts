import type { ReviewStatus } from '../constants/review.constants';

export interface CreateReviewRecord {
  bookingId: string;
  body: string;
  rating: number;
  status: ReviewStatus;
  tourId: string;
  userId: string;
}
