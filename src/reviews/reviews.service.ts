import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not } from 'typeorm';
import type { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { FILE_STORAGE_ERROR_KEYS } from '../files/constants/file.constants';
import { FileStorageService } from '../files/file-storage.service';
import type { StoredImage } from '../files/interfaces/stored-image.interface';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import { TourStatus } from '../tours/constants/tour.constants';
import { TourEntity } from '../tours/entities/tour.entity';
import {
  FIRST_REVIEW_IMAGE_SORT_ORDER,
  MAX_REVIEW_IMAGE_COUNT,
  REVIEW_IMAGE_ERROR_KEYS,
  REVIEW_IMAGE_FOLDER_NAME,
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_ELIGIBLE_BOOKING_QUERY_FIELDS,
  REVIEW_IMAGE_MANAGEMENT_QUERY_FIELDS,
  REVIEW_IMAGE_PUBLIC_QUERY_FIELDS,
  REVIEW_INSERT_RETURNING_FIELDS,
  REVIEW_ADMIN_QUERY_FIELDS,
  REVIEW_MANAGEMENT_QUERY_FIELDS,
  REVIEW_PUBLIC_QUERY_FIELDS,
  REVIEW_TOUR_QUERY_FIELDS,
  REVIEW_IMAGE_SORT_ORDER_INCREMENT,
  ReviewStatus,
} from './constants/review.constants';
import type { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import type { AdminReviewResponseDto } from './dto/admin-review-response.dto';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ModerateReviewDto } from './dto/moderate-review.dto';
import type { ReviewQueryDto } from './dto/review-query.dto';
import type { ReviewResponseDto } from './dto/review-response.dto';
import type { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewImageEntity } from './entities/review-image.entity';
import { ReviewEntity } from './entities/review.entity';
import type { AdminReviewList } from './interfaces/admin-review-list.interface';
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
    @InjectRepository(ReviewImageEntity)
    private readonly reviewImagesRepository: Repository<ReviewImageEntity>,
    private readonly fileStorage: FileStorageService,
  ) {}

  async create(
    userId: string,
    tourId: string,
    input: CreateReviewDto,
    images: readonly UploadedImage[] = [],
  ): Promise<ReviewResponseDto> {
    const body = this.normalizeBody(input.body);

    if (images.length > MAX_REVIEW_IMAGE_COUNT) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.tooManyImages);
    }

    let stored: StoredImage[] = [];
    try {
      return await this.dataSource.transaction(async (manager) => {
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

        stored = images.length
          ? await this.fileStorage.store(
              images,
              REVIEW_IMAGE_FOLDER_NAME,
              MAX_REVIEW_IMAGE_COUNT,
            )
          : [];

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

        const savedImages = await this.saveImages(
          manager,
          review.id,
          stored,
          FIRST_REVIEW_IMAGE_SORT_ORDER,
        );
        return this.toResponse(review, savedImages);
      });
    } catch (error: unknown) {
      await this.fileStorage.removeBestEffort(
        stored.map((image) => image.storageKey),
      );
      throw error;
    }
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

    const imagesByReviewId = await this.findImagesByReviewIds(
      reviews.map((review) => review.id),
    );

    return {
      meta: createPaginationMeta(query.page, query.limit, totalItems),
      reviews: reviews.map((review) =>
        this.toResponse(review, imagesByReviewId.get(review.id) ?? []),
      ),
    };
  }

  async findForAdmin(query: AdminReviewQueryDto): Promise<AdminReviewList> {
    const reviewsQuery = this.reviewsRepository
      .createQueryBuilder('review')
      .select([...REVIEW_ADMIN_QUERY_FIELDS])
      .orderBy('review.createdAt', 'DESC')
      .addOrderBy('review.id', 'DESC')
      .skip(query.offset)
      .take(query.limit);

    if (query.status) {
      reviewsQuery.andWhere('review.status = :status', {
        status: query.status,
      });
    }
    if (query.tourId) {
      reviewsQuery.andWhere('review.tourId = :tourId', {
        tourId: query.tourId,
      });
    }
    if (query.userId) {
      reviewsQuery.andWhere('review.userId = :userId', {
        userId: query.userId,
      });
    }

    const [reviews, totalItems] = await reviewsQuery.getManyAndCount();
    const visibleReviewIds = reviews
      .filter((review) => review.status !== ReviewStatus.DELETED)
      .map((review) => review.id);
    const imagesByReviewId = await this.findImagesByReviewIds(visibleReviewIds);

    return {
      meta: createPaginationMeta(query.page, query.limit, totalItems),
      reviews: reviews.map((review) =>
        this.toAdminResponse(review, imagesByReviewId.get(review.id) ?? []),
      ),
    };
  }

  async updateOwn(
    userId: string,
    tourId: string,
    reviewId: string,
    input: UpdateReviewDto,
    images: readonly UploadedImage[] = [],
  ): Promise<ReviewResponseDto> {
    const removeImageIds = input.removeImageIds ?? [];
    if (
      input.body === undefined &&
      input.rating === undefined &&
      images.length === 0 &&
      removeImageIds.length === 0
    ) {
      throw new BadRequestException('errors.reviewUpdateRequired');
    }

    if (images.length > MAX_REVIEW_IMAGE_COUNT) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.tooManyImages);
    }

    if (new Set(removeImageIds).size !== removeImageIds.length) {
      throw new BadRequestException(REVIEW_IMAGE_ERROR_KEYS.invalid);
    }

    const changes: Partial<Pick<ReviewEntity, 'body' | 'rating'>> = {};
    if (input.body !== undefined) {
      changes.body = this.normalizeBody(input.body);
    }
    if (input.rating !== undefined) {
      changes.rating = input.rating;
    }

    if (images.length === 0 && removeImageIds.length === 0) {
      return this.updateReview(reviewId, changes, { tourId, userId });
    }

    return this.updateOwnWithImages(
      reviewId,
      tourId,
      userId,
      changes,
      images,
      removeImageIds,
    );
  }

  async removeOwn(
    userId: string,
    tourId: string,
    reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.deleteReview(reviewId, { tourId, userId });
  }

  async moderate(
    reviewId: string,
    input: ModerateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.updateReview(reviewId, { status: input.status });
  }

  async removeAsAdmin(reviewId: string): Promise<ReviewResponseDto> {
    return this.deleteReview(reviewId);
  }

  private async deleteReview(
    reviewId: string,
    scope?: { tourId: string; userId: string },
  ): Promise<ReviewResponseDto> {
    const { review, storageKeys } = await this.dataSource.transaction(
      async (manager) => {
        const reviewRepository = manager.getRepository(ReviewEntity);
        const imageRepository = manager.getRepository(ReviewImageEntity);
        const result = await reviewRepository.update(
          { id: reviewId, status: Not(ReviewStatus.DELETED), ...scope },
          { status: ReviewStatus.DELETED },
        );

        if (!result.affected) {
          throw new NotFoundException('errors.reviewNotFound');
        }

        const review = await reviewRepository.findOne({
          select: [...REVIEW_MANAGEMENT_QUERY_FIELDS],
          where: { id: reviewId },
        });
        if (!review) {
          throw new NotFoundException('errors.reviewNotFound');
        }

        const images = await imageRepository.find({
          select: [...REVIEW_IMAGE_MANAGEMENT_QUERY_FIELDS],
          where: { reviewId },
        });
        if (images.length > 0) {
          await imageRepository.delete({ reviewId });
        }

        return {
          review,
          storageKeys: images.map((image) => image.storageKey),
        };
      },
    );

    await this.fileStorage.removeBestEffort(storageKeys);
    return this.toResponse(review, []);
  }

  private async updateOwnWithImages(
    reviewId: string,
    tourId: string,
    userId: string,
    changes: Partial<Pick<ReviewEntity, 'body' | 'rating'>>,
    images: readonly UploadedImage[],
    removeImageIds: readonly string[],
  ): Promise<ReviewResponseDto> {
    let stored: StoredImage[] = [];
    let removedKeys: string[] = [];

    try {
      const response = await this.dataSource.transaction(async (manager) => {
        const reviewRepository = manager.getRepository(ReviewEntity);
        const imageRepository = manager.getRepository(ReviewImageEntity);
        const review = await reviewRepository.findOne({
          select: [...REVIEW_MANAGEMENT_QUERY_FIELDS],
          where: {
            id: reviewId,
            tourId,
            userId,
            status: Not(ReviewStatus.DELETED),
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!review) {
          throw new NotFoundException('errors.reviewNotFound');
        }

        const currentImages = await imageRepository.find({
          select: [...REVIEW_IMAGE_MANAGEMENT_QUERY_FIELDS],
          where: { reviewId },
          order: { sortOrder: 'ASC', id: 'ASC' },
        });
        const removeSet = new Set(removeImageIds);
        const removed = currentImages.filter((image) =>
          removeSet.has(image.id),
        );
        if (removed.length !== removeSet.size) {
          throw new BadRequestException(REVIEW_IMAGE_ERROR_KEYS.invalid);
        }

        const retained = currentImages.filter(
          (image) => !removeSet.has(image.id),
        );
        if (retained.length + images.length > MAX_REVIEW_IMAGE_COUNT) {
          throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.tooManyImages);
        }

        stored = images.length
          ? await this.fileStorage.store(
              images,
              REVIEW_IMAGE_FOLDER_NAME,
              MAX_REVIEW_IMAGE_COUNT,
            )
          : [];

        if (Object.keys(changes).length > 0) {
          await reviewRepository.update({ id: reviewId }, changes);
        }
        if (removed.length > 0) {
          await imageRepository.delete({
            reviewId,
            id: In(removed.map((image) => image.id)),
          });
        }

        const nextSortOrder = retained.length
          ? Math.max(...retained.map((image) => image.sortOrder)) +
            REVIEW_IMAGE_SORT_ORDER_INCREMENT
          : FIRST_REVIEW_IMAGE_SORT_ORDER;
        const added = await this.saveImages(
          manager,
          reviewId,
          stored,
          nextSortOrder,
        );
        const updatedReview = await reviewRepository.findOne({
          select: [...REVIEW_MANAGEMENT_QUERY_FIELDS],
          where: { id: reviewId },
        });

        if (!updatedReview) {
          throw new NotFoundException('errors.reviewNotFound');
        }

        removedKeys = removed.map((image) => image.storageKey);
        return this.toResponse(updatedReview, [...retained, ...added]);
      });

      await this.fileStorage.removeBestEffort(removedKeys);
      return response;
    } catch (error: unknown) {
      await this.fileStorage.removeBestEffort(
        stored.map((image) => image.storageKey),
      );
      throw error;
    }
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

    const images = await this.reviewImagesRepository.find({
      select: [...REVIEW_IMAGE_PUBLIC_QUERY_FIELDS],
      where: { reviewId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return this.toResponse(review, images);
  }

  private async saveImages(
    manager: EntityManager,
    reviewId: string,
    stored: readonly StoredImage[],
    firstSortOrder: number,
  ): Promise<ReviewImageEntity[]> {
    if (stored.length === 0) {
      return [];
    }

    const imageRepository = manager.getRepository(ReviewImageEntity);
    return imageRepository.save(
      stored.map((image, index) =>
        imageRepository.create({
          ...image,
          reviewId,
          sortOrder: firstSortOrder + index * REVIEW_IMAGE_SORT_ORDER_INCREMENT,
        }),
      ),
    );
  }

  private async findImagesByReviewIds(
    reviewIds: readonly string[],
  ): Promise<Map<string, ReviewImageEntity[]>> {
    const grouped = new Map<string, ReviewImageEntity[]>();
    if (reviewIds.length === 0) {
      return grouped;
    }

    const images = await this.reviewImagesRepository.find({
      select: [...REVIEW_IMAGE_PUBLIC_QUERY_FIELDS],
      where: { reviewId: In([...reviewIds]) },
      order: { reviewId: 'ASC', sortOrder: 'ASC', id: 'ASC' },
    });

    for (const image of images) {
      const group = grouped.get(image.reviewId) ?? [];
      group.push(image);
      grouped.set(image.reviewId, group);
    }

    return grouped;
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

  private toResponse(
    review: ReviewEntity,
    images: readonly ReviewImageEntity[],
  ): ReviewResponseDto {
    return {
      body: review.body,
      createdAt: review.createdAt,
      id: review.id,
      images: images.map((image) => ({
        id: image.id,
        mimeType: image.mimeType,
        originalName: image.originalName,
        sizeBytes: image.sizeBytes,
        sortOrder: image.sortOrder,
        url: image.url,
      })),
      rating: review.rating,
      status: review.status,
      tourId: review.tourId,
      updatedAt: review.updatedAt,
    };
  }

  private toAdminResponse(
    review: ReviewEntity,
    images: readonly ReviewImageEntity[],
  ): AdminReviewResponseDto {
    return {
      ...this.toResponse(review, images),
      userId: review.userId,
    };
  }
}
