import type { EntityManager } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import {
  REVIEW_ELIGIBLE_BOOKING_QUERY_FIELDS,
  REVIEW_EXISTENCE_QUERY_FIELDS,
  REVIEW_INSERT_RETURNING_FIELDS,
  REVIEW_TOUR_QUERY_FIELDS,
} from './constants/review.constants';
import { ReviewEntity } from './entities/review.entity';
import type { CreateReviewRecord } from './interfaces/create-review-record.interface';
import type { ReviewSubmissionTransaction } from './interfaces/review-submission-transaction.interface';

export class ReviewSubmissionTransactionStore implements ReviewSubmissionTransaction {
  constructor(private readonly manager: EntityManager) {}

  async createReview(input: CreateReviewRecord): Promise<ReviewEntity | null> {
    const reviewRepository = this.manager.getRepository(ReviewEntity);
    const result = await reviewRepository
      .createQueryBuilder()
      .insert()
      .into(ReviewEntity)
      .values(input)
      .orIgnore()
      .returning([...REVIEW_INSERT_RETURNING_FIELDS])
      .execute();
    const insertedValues = result.generatedMaps[0] as
      Partial<ReviewEntity> | undefined;

    return insertedValues
      ? reviewRepository.create({ ...input, ...insertedValues })
      : null;
  }

  findEligibleBooking(
    userId: string,
    tourId: string,
  ): Promise<BookingEntity | null> {
    return this.manager
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .innerJoin('booking.departure', 'departure')
      .select(REVIEW_ELIGIBLE_BOOKING_QUERY_FIELDS)
      .where('booking.user_id = :userId', { userId })
      .andWhere('booking.status = :status', { status: BookingStatus.APPROVED })
      .andWhere('departure.tour_id = :tourId', { tourId })
      .andWhere('departure.end_at <= CURRENT_TIMESTAMP')
      .orderBy('departure.end_at', 'DESC')
      .addOrderBy('booking.id', 'DESC')
      .getOne();
  }

  findExistingReview(
    userId: string,
    tourId: string,
  ): Promise<ReviewEntity | null> {
    return this.manager.getRepository(ReviewEntity).findOne({
      select: [...REVIEW_EXISTENCE_QUERY_FIELDS],
      where: { tourId, userId },
    });
  }

  findTour(tourId: string): Promise<TourEntity | null> {
    return this.manager.getRepository(TourEntity).findOne({
      select: [...REVIEW_TOUR_QUERY_FIELDS],
      where: { id: tourId },
    });
  }
}
