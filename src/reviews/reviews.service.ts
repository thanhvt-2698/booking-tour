import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import {
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_ELIGIBLE_BOOKING_QUERY_FIELDS,
  REVIEW_INSERT_RETURNING_FIELDS,
  REVIEW_TOUR_QUERY_FIELDS,
  ReviewStatus,
} from './constants/review.constants';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewEntity } from './entities/review.entity';
import type { CreateReviewRecord } from './interfaces/create-review-record.interface';

@Injectable()
export class ReviewsService {
  constructor(private readonly dataSource: DataSource) {}

  async create(
    userId: string,
    tourId: string,
    input: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const body = this.normalizeBody(input.body);

    return this.dataSource.transaction(async (manager) => {
      const tour = await manager.getRepository(TourEntity).findOne({
        select: [...REVIEW_TOUR_QUERY_FIELDS],
        where: { id: tourId },
      });

      if (!tour) {
        throw new NotFoundException('errors.tourNotFound');
      }

      const hasExistingReview = await manager
        .getRepository(ReviewEntity)
        .existsBy({ tourId, userId });

      if (hasExistingReview) {
        throw new ConflictException('errors.reviewAlreadyExists');
      }

      const eligibleBooking = await this.findEligibleBooking(
        manager,
        userId,
        tourId,
      );

      if (!eligibleBooking) {
        throw new ConflictException('errors.reviewNotEligible');
      }

      const review = await this.createReview(manager, {
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

  private async createReview(
    manager: EntityManager,
    input: CreateReviewRecord,
  ): Promise<ReviewEntity | null> {
    const reviewRepository = manager.getRepository(ReviewEntity);
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

  private findEligibleBooking(
    manager: EntityManager,
    userId: string,
    tourId: string,
  ): Promise<BookingEntity | null> {
    return manager
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
