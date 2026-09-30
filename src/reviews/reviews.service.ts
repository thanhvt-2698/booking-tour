import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not } from 'typeorm';
import type { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { TourStatus } from '../tours/constants/tour.constants';
import { TourEntity } from '../tours/entities/tour.entity';
import {
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_ELIGIBLE_BOOKING_QUERY_FIELDS,
  REVIEW_INSERT_RETURNING_FIELDS,
  REVIEW_MANAGEMENT_QUERY_FIELDS,
  REVIEW_PUBLIC_QUERY_FIELDS,
  REVIEW_TOUR_QUERY_FIELDS,
  ReviewStatus,
} from './constants/review.constants';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ModerateReviewDto } from './dto/moderate-review.dto';
import type { ReviewQueryDto } from './dto/review-query.dto';
import type { ReviewResponseDto } from './dto/review-response.dto';
import type { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewEntity } from './entities/review.entity';
import type { CreateReviewRecord } from './interfaces/create-review-record.interface';
import type { ReviewList } from './interfaces/review-list.interface';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ReviewEntity)
    private readonly reviewsRepository: Repository<ReviewEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
  ) {}

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

  async findPublicByTour(
    tourId: string,
    query: ReviewQueryDto,
  ): Promise<ReviewList> {
    const isPublishedTour = await this.toursRepository.existsBy({
      id: tourId,
      status: TourStatus.PUBLISHED,
    });

    if (!isPublishedTour) {
      throw new NotFoundException('errors.tourNotFound');
    }

    const [reviews, totalItems] = await this.reviewsRepository
      .createQueryBuilder('review')
      .select([...REVIEW_PUBLIC_QUERY_FIELDS])
      .where('review.tourId = :tourId', { tourId })
      .andWhere('review.status = :status', { status: ReviewStatus.PUBLISHED })
      .orderBy('review.createdAt', 'DESC')
      .addOrderBy('review.id', 'DESC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();

    return {
      meta: createPaginationMeta(query.page, query.limit, totalItems),
      reviews: reviews.map((review) => this.toResponse(review)),
    };
  }

  async updateOwn(
    userId: string,
    tourId: string,
    reviewId: string,
    input: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    if (input.body === undefined && input.rating === undefined) {
      throw new BadRequestException('errors.reviewUpdateRequired');
    }

    const changes: Partial<Pick<ReviewEntity, 'body' | 'rating'>> = {};
    if (input.body !== undefined) {
      changes.body = this.normalizeBody(input.body);
    }
    if (input.rating !== undefined) {
      changes.rating = input.rating;
    }

    return this.updateReview(reviewId, changes, { tourId, userId });
  }

  async removeOwn(
    userId: string,
    tourId: string,
    reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.updateReview(
      reviewId,
      { status: ReviewStatus.DELETED },
      { tourId, userId },
    );
  }

  async moderate(
    reviewId: string,
    input: ModerateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.updateReview(reviewId, { status: input.status });
  }

  async removeAsAdmin(reviewId: string): Promise<ReviewResponseDto> {
    return this.updateReview(reviewId, { status: ReviewStatus.DELETED });
  }

  private async updateReview(
    reviewId: string,
    changes: Partial<Pick<ReviewEntity, 'body' | 'rating' | 'status'>>,
    scope?: { tourId: string; userId: string },
  ): Promise<ReviewResponseDto> {
    const where: FindOptionsWhere<ReviewEntity> = {
      id: reviewId,
      status: Not(ReviewStatus.DELETED),
      ...scope,
    };
    const result = await this.reviewsRepository.update(where, changes);

    if (!result.affected) {
      throw new NotFoundException('errors.reviewNotFound');
    }

    const review = await this.reviewsRepository.findOne({
      select: [...REVIEW_MANAGEMENT_QUERY_FIELDS],
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('errors.reviewNotFound');
    }

    return this.toResponse(review);
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
