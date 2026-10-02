import { BadRequestException, NotFoundException } from '@nestjs/common';
import { In, Not } from 'typeorm';
import type { DataSource, Repository } from 'typeorm';
import { TourStatus } from '../tours/constants/tour.constants';
import { TourEntity } from '../tours/entities/tour.entity';
import {
  REVIEW_ADMIN_QUERY_FIELDS,
  REVIEW_MANAGEMENT_QUERY_FIELDS,
  REVIEW_PUBLIC_QUERY_FIELDS,
  ReviewStatus,
} from './constants/review.constants';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsService } from './reviews.service';
import type { FileStorageService } from '../files/file-storage.service';
import { ReviewImageEntity } from './entities/review-image.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import {
  REVIEW_IMAGE_MANAGEMENT_QUERY_FIELDS,
  REVIEW_IMAGE_PUBLIC_QUERY_FIELDS,
  REVIEW_TOUR_QUERY_FIELDS,
} from './constants/review.constants';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import type { StoredImage } from '../files/interfaces/stored-image.interface';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let existsByMock: jest.Mock;
  let findOneMock: jest.Mock;
  let findImagesMock: jest.Mock;
  let getManyAndCountMock: jest.Mock;
  let selectMock: jest.Mock;
  let andWhereMock: jest.Mock;
  let orderByMock: jest.Mock;
  let addOrderByMock: jest.Mock;
  let skipMock: jest.Mock;
  let takeMock: jest.Mock;
  let whereMock: jest.Mock;
  let updateMock: jest.Mock;
  let storedReview: ReviewEntity;

  const review = {
    body: 'Excellent tour',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    id: 'review-id',
    rating: 5,
    status: ReviewStatus.PUBLISHED,
    tourId: 'tour-id',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 'user-id',
  } as ReviewEntity;

  beforeEach(() => {
    existsByMock = jest.fn().mockResolvedValue(true);
    storedReview = { ...review };
    findOneMock = jest.fn(() => Promise.resolve({ ...storedReview }));
    getManyAndCountMock = jest.fn().mockResolvedValue([[review], 1]);
    updateMock = jest.fn((_where: unknown, changes: Partial<ReviewEntity>) => {
      Object.assign(storedReview, changes);
      return Promise.resolve({ affected: 1 });
    });
    selectMock = jest.fn().mockReturnThis();
    andWhereMock = jest.fn().mockReturnThis();
    orderByMock = jest.fn().mockReturnThis();
    addOrderByMock = jest.fn().mockReturnThis();
    skipMock = jest.fn().mockReturnThis();
    takeMock = jest.fn().mockReturnThis();
    whereMock = jest.fn().mockReturnThis();
    const queryBuilder = {
      addOrderBy: addOrderByMock,
      andWhere: andWhereMock,
      getManyAndCount: getManyAndCountMock,
      orderBy: orderByMock,
      select: selectMock,
      skip: skipMock,
      take: takeMock,
      where: whereMock,
    };
    const reviewsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: findOneMock,
      update: updateMock,
    } as unknown as Repository<ReviewEntity>;
    const toursRepository = {
      existsBy: existsByMock,
    } as unknown as Repository<TourEntity>;
    findImagesMock = jest.fn().mockResolvedValue([]);
    const reviewImagesRepository = {
      find: findImagesMock,
    } as unknown as Repository<ReviewImageEntity>;
    const dataSource = {
      transaction: jest.fn(
        async (callback: (manager: unknown) => Promise<unknown>) =>
          callback({
            getRepository: (entity: unknown) =>
              entity === ReviewEntity
                ? reviewsRepository
                : reviewImagesRepository,
          }),
      ),
    } as unknown as DataSource;
    service = new ReviewsService(
      dataSource,
      reviewsRepository,
      toursRepository,
      reviewImagesRepository,
      {
        removeBestEffort: jest.fn().mockResolvedValue(undefined),
      } as unknown as FileStorageService,
    );
  });

  it('lists only published reviews with bounded fields and stable ordering', async () => {
    const query = new ReviewQueryDto();
    query.page = 2;
    query.limit = 1;

    await expect(service.findPublicByTour('tour-id', query)).resolves.toEqual({
      meta: { currentPage: 2, pageSize: 1, totalItems: 1, totalPages: 1 },
      reviews: [
        {
          body: review.body,
          createdAt: review.createdAt,
          id: review.id,
          images: [],
          rating: review.rating,
          status: review.status,
          tourId: review.tourId,
          updatedAt: review.updatedAt,
        },
      ],
    });
    expect(existsByMock).toHaveBeenCalledWith({
      id: 'tour-id',
      status: TourStatus.PUBLISHED,
    });
    expect(selectMock).toHaveBeenCalledWith([...REVIEW_PUBLIC_QUERY_FIELDS]);
    expect(andWhereMock).toHaveBeenCalledWith('review.status = :status', {
      status: ReviewStatus.PUBLISHED,
    });
    expect(orderByMock).toHaveBeenCalledWith('review.createdAt', 'DESC');
    expect(addOrderByMock).toHaveBeenCalledWith('review.id', 'DESC');
    expect(skipMock).toHaveBeenCalledWith(1);
    expect(takeMock).toHaveBeenCalledWith(1);
  });

  it('lists admin reviews with bounded fields, filters, pagination, and images', async () => {
    const adminUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const adminTourId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const hiddenReview = {
      ...review,
      status: ReviewStatus.HIDDEN,
      tourId: adminTourId,
      userId: adminUserId,
    };
    const image = {
      id: 'image-id',
      mimeType: 'image/jpeg',
      originalName: 'photo.jpg',
      reviewId: review.id,
      sizeBytes: 123,
      sortOrder: 0,
      storageKey: 'reviews/private-key.jpg',
      url: '/api/review-images/photo.jpg',
    } as ReviewImageEntity;
    getManyAndCountMock.mockResolvedValue([[hiddenReview], 1]);
    findImagesMock.mockResolvedValue([image]);
    const query = new AdminReviewQueryDto();
    query.page = 2;
    query.limit = 1;
    query.status = ReviewStatus.HIDDEN;
    query.tourId = adminTourId;
    query.userId = adminUserId;

    await expect(service.findForAdmin(query)).resolves.toEqual({
      meta: { currentPage: 2, pageSize: 1, totalItems: 1, totalPages: 1 },
      reviews: [
        {
          body: hiddenReview.body,
          createdAt: hiddenReview.createdAt,
          id: hiddenReview.id,
          images: [
            {
              id: image.id,
              mimeType: image.mimeType,
              originalName: image.originalName,
              sizeBytes: image.sizeBytes,
              sortOrder: image.sortOrder,
              url: image.url,
            },
          ],
          rating: hiddenReview.rating,
          status: ReviewStatus.HIDDEN,
          tourId: adminTourId,
          updatedAt: hiddenReview.updatedAt,
          userId: adminUserId,
        },
      ],
    });

    expect(selectMock).toHaveBeenCalledWith([...REVIEW_ADMIN_QUERY_FIELDS]);
    expect(andWhereMock).toHaveBeenCalledWith('review.status = :status', {
      status: ReviewStatus.HIDDEN,
    });
    expect(andWhereMock).toHaveBeenCalledWith('review.tourId = :tourId', {
      tourId: adminTourId,
    });
    expect(andWhereMock).toHaveBeenCalledWith('review.userId = :userId', {
      userId: adminUserId,
    });
    expect(orderByMock).toHaveBeenCalledWith('review.createdAt', 'DESC');
    expect(addOrderByMock).toHaveBeenCalledWith('review.id', 'DESC');
    expect(skipMock).toHaveBeenCalledWith(1);
    expect(takeMock).toHaveBeenCalledWith(1);
    expect(findImagesMock).toHaveBeenCalledWith({
      order: { reviewId: 'ASC', sortOrder: 'ASC', id: 'ASC' },
      select: [...REVIEW_IMAGE_PUBLIC_QUERY_FIELDS],
      where: { reviewId: In([review.id]) },
    });
  });

  it('includes all review statuses when no status filter is supplied', async () => {
    const statuses = [
      ReviewStatus.PUBLISHED,
      ReviewStatus.HIDDEN,
      ReviewStatus.DELETED,
    ];
    getManyAndCountMock.mockResolvedValue([
      statuses.map((status) => ({ ...review, id: `review-${status}`, status })),
      statuses.length,
    ]);

    const result = await service.findForAdmin(new AdminReviewQueryDto());

    expect(result.reviews.map((item) => item.status)).toEqual(statuses);
    expect(
      result.reviews.find((item) => item.status === ReviewStatus.DELETED)
        ?.images,
    ).toEqual([]);
    expect(andWhereMock).not.toHaveBeenCalled();
  });

  it('supports filtering deleted reviews and omits their images', async () => {
    const deletedReview = {
      ...review,
      status: ReviewStatus.DELETED,
      userId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    };
    getManyAndCountMock.mockResolvedValue([[deletedReview], 1]);
    const query = new AdminReviewQueryDto();
    query.status = ReviewStatus.DELETED;

    await expect(service.findForAdmin(query)).resolves.toMatchObject({
      reviews: [{ images: [], status: ReviewStatus.DELETED }],
    });

    expect(andWhereMock).toHaveBeenCalledWith('review.status = :status', {
      status: ReviewStatus.DELETED,
    });
    expect(findImagesMock).not.toHaveBeenCalled();
  });

  it('does not query image metadata for an empty admin page', async () => {
    getManyAndCountMock.mockResolvedValue([[], 0]);

    await expect(
      service.findForAdmin(new AdminReviewQueryDto()),
    ).resolves.toMatchObject({
      meta: { totalItems: 0, totalPages: 0 },
      reviews: [],
    });

    expect(findImagesMock).not.toHaveBeenCalled();
  });

  it('does not expose reviews of a draft or absent tour', async () => {
    existsByMock.mockResolvedValue(false);

    await expect(
      service.findPublicByTour('tour-id', new ReviewQueryDto()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(getManyAndCountMock).not.toHaveBeenCalled();
  });

  it('updates only an owned non-deleted review and keeps its moderation status', async () => {
    storedReview.status = ReviewStatus.HIDDEN;

    await expect(
      service.updateOwn('user-id', 'tour-id', 'review-id', {
        body: '  Updated review  ',
        rating: 4,
      }),
    ).resolves.toMatchObject({
      body: 'Updated review',
      rating: 4,
      status: ReviewStatus.HIDDEN,
    });
    expect(updateMock).toHaveBeenCalledWith(
      {
        id: 'review-id',
        status: Not(ReviewStatus.DELETED),
        tourId: 'tour-id',
        userId: 'user-id',
      },
      { body: 'Updated review', rating: 4 },
    );
    expect(findOneMock).toHaveBeenCalledWith({
      select: [...REVIEW_MANAGEMENT_QUERY_FIELDS],
      where: { id: 'review-id' },
    });
  });

  it('rejects an empty update and hides ownership failures', async () => {
    await expect(
      service.updateOwn('user-id', 'tour-id', 'review-id', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    updateMock.mockResolvedValue({ affected: 0 });
    await expect(
      service.updateOwn('user-id', 'tour-id', 'review-id', { rating: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it('soft deletes an owned review', async () => {
    await expect(
      service.removeOwn('user-id', 'tour-id', 'review-id'),
    ).resolves.toMatchObject({ status: ReviewStatus.DELETED });
    expect(updateMock).toHaveBeenCalledWith(
      {
        id: 'review-id',
        status: Not(ReviewStatus.DELETED),
        tourId: 'tour-id',
        userId: 'user-id',
      },
      { status: ReviewStatus.DELETED },
    );
  });

  it('lets an admin hide, republish, and soft delete a review', async () => {
    await expect(
      service.moderate('review-id', { status: ReviewStatus.HIDDEN }),
    ).resolves.toMatchObject({ status: ReviewStatus.HIDDEN });
    await expect(
      service.moderate('review-id', { status: ReviewStatus.PUBLISHED }),
    ).resolves.toMatchObject({ status: ReviewStatus.PUBLISHED });
    await expect(service.removeAsAdmin('review-id')).resolves.toMatchObject({
      status: ReviewStatus.DELETED,
    });
  });

  it('does not moderate a deleted review', async () => {
    updateMock.mockResolvedValue({ affected: 0 });

    await expect(
      service.moderate('review-id', { status: ReviewStatus.PUBLISHED }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ReviewsService image transactions', () => {
  let service: ReviewsService;
  let reviewRepository: Record<string, jest.Mock>;
  let imageRepository: Record<string, jest.Mock>;
  let tourRepository: Record<string, jest.Mock>;
  let storage: Record<string, jest.Mock>;
  let transaction: jest.Mock;
  let insert: Record<string, jest.Mock>;
  const review = {
    body: 'Original',
    createdAt: new Date('2026-01-01'),
    id: 'review-id',
    rating: 5,
    status: ReviewStatus.HIDDEN,
    tourId: 'tour-id',
    updatedAt: new Date('2026-01-01'),
  } as ReviewEntity;
  const upload: UploadedImage = {
    buffer: Buffer.from('image'),
    mimetype: 'image/png',
    originalname: 'photo.png',
    size: 5,
  };
  const stored: StoredImage = {
    mimeType: 'image/png',
    originalName: 'photo.png',
    sizeBytes: 5,
    storageKey: 'reviews/new.png',
    url: '/api/review-images/new.png',
  };
  const existingImage = {
    ...stored,
    id: 'old-image',
    reviewId: 'review-id',
    sortOrder: 0,
    storageKey: 'reviews/old.png',
  } as ReviewImageEntity;

  beforeEach(() => {
    insert = {
      execute: jest.fn().mockResolvedValue({ generatedMaps: [review] }),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
    };
    reviewRepository = {
      create: jest.fn((input: unknown) => input),
      createQueryBuilder: jest.fn().mockReturnValue(insert),
      existsBy: jest.fn().mockResolvedValue(false),
      findOne: jest.fn().mockResolvedValue(review),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    imageRepository = {
      create: jest.fn((input: unknown) => input),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn((images: Partial<ReviewImageEntity>[]) =>
        Promise.resolve(images.map((image) => ({ ...image, id: 'new-image' }))),
      ),
    };
    tourRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'tour-id' }),
    };
    const bookingQuery = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'booking-id' }),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === ReviewEntity) return reviewRepository;
        if (entity === ReviewImageEntity) return imageRepository;
        if (entity === TourEntity) return tourRepository;
        if (entity === BookingEntity)
          return { createQueryBuilder: () => bookingQuery };
        throw new Error('Unexpected test repository');
      },
    };
    transaction = jest.fn((callback: (manager: unknown) => Promise<unknown>) =>
      callback(manager),
    );
    storage = {
      removeBestEffort: jest.fn().mockResolvedValue(undefined),
      store: jest.fn().mockResolvedValue([stored]),
    };
    service = new ReviewsService(
      { transaction } as unknown as DataSource,
      reviewRepository as unknown as Repository<ReviewEntity>,
      tourRepository as unknown as Repository<TourEntity>,
      imageRepository as unknown as Repository<ReviewImageEntity>,
      storage as unknown as FileStorageService,
    );
  });

  it('creates a review and its image metadata in one transaction without exposing storage keys', async () => {
    const response = await service.create(
      'user-id',
      'tour-id',
      { body: '  Nice tour  ', rating: 5 },
      [upload],
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tourRepository.findOne).toHaveBeenCalledWith({
      select: [...REVIEW_TOUR_QUERY_FIELDS],
      where: { id: 'tour-id' },
    });
    expect(storage.store).toHaveBeenCalledWith([upload], 'reviews', 3);
    expect(insert.values).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Nice tour', bookingId: 'booking-id' }),
    );
    expect(imageRepository.save).toHaveBeenCalledWith([
      { ...stored, reviewId: 'review-id', sortOrder: 0 },
    ]);
    expect(response.images).toEqual([
      {
        id: 'new-image',
        mimeType: stored.mimeType,
        originalName: stored.originalName,
        sizeBytes: stored.sizeBytes,
        sortOrder: 0,
        url: stored.url,
      },
    ]);
  });

  it('rejects more than three incoming files before writing or starting a transaction', async () => {
    await expect(
      service.create('user-id', 'tour-id', { body: 'Nice', rating: 5 }, [
        upload,
        upload,
        upload,
        upload,
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
    expect(storage.store).not.toHaveBeenCalled();
  });

  it('removes newly stored files if the metadata insert fails', async () => {
    const databaseError = new Error('Database write failed');
    imageRepository.save.mockRejectedValue(databaseError);
    await expect(
      service.create('user-id', 'tour-id', { body: 'Nice', rating: 5 }, [
        upload,
      ]),
    ).rejects.toBe(databaseError);
    expect(storage.removeBestEffort).toHaveBeenCalledWith([stored.storageKey]);
  });

  it('locks the owned review, replaces images and removes old files only after commit', async () => {
    imageRepository.find.mockResolvedValue([existingImage]);
    transaction.mockImplementation(
      async (callback: (manager: unknown) => Promise<unknown>) => {
        const response = await callback({
          getRepository: (entity: unknown) =>
            entity === ReviewEntity ? reviewRepository : imageRepository,
        });
        expect(storage.removeBestEffort).not.toHaveBeenCalled();
        return response;
      },
    );
    const response = await service.updateOwn(
      'user-id',
      'tour-id',
      'review-id',
      { removeImageIds: ['old-image'] },
      [upload],
    );
    expect(reviewRepository.findOne).toHaveBeenNthCalledWith(1, {
      select: [...REVIEW_MANAGEMENT_QUERY_FIELDS],
      where: {
        id: 'review-id',
        tourId: 'tour-id',
        userId: 'user-id',
        status: Not(ReviewStatus.DELETED),
      },
      lock: { mode: 'pessimistic_write' },
    });
    expect(imageRepository.find).toHaveBeenCalledWith({
      select: [...REVIEW_IMAGE_MANAGEMENT_QUERY_FIELDS],
      where: { reviewId: 'review-id' },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    expect(response).toMatchObject({ status: ReviewStatus.HIDDEN });
    expect(response.images).toHaveLength(1);
    expect(storage.removeBestEffort).toHaveBeenCalledWith(['reviews/old.png']);
  });

  it('rejects foreign image IDs, duplicate IDs and a total above three before storing', async () => {
    imageRepository.find.mockResolvedValue([existingImage]);
    await expect(
      service.updateOwn('user-id', 'tour-id', 'review-id', {
        removeImageIds: ['foreign-image'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateOwn('user-id', 'tour-id', 'review-id', {
        removeImageIds: ['old-image', 'old-image'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    imageRepository.find.mockResolvedValue([
      existingImage,
      { ...existingImage, id: 'second-image' },
      { ...existingImage, id: 'third-image' },
    ]);
    await expect(
      service.updateOwn('user-id', 'tour-id', 'review-id', {}, [upload]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.store).not.toHaveBeenCalled();
    expect(imageRepository.delete).not.toHaveBeenCalled();
  });

  it('does not write a file when the review is not owned or is deleted', async () => {
    reviewRepository.findOne.mockResolvedValue(null);
    await expect(
      service.updateOwn('other-user', 'tour-id', 'review-id', {}, [upload]),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.store).not.toHaveBeenCalled();
  });

  it('cleans up only new files if an image replacement transaction fails', async () => {
    imageRepository.find.mockResolvedValue([existingImage]);
    const databaseError = new Error('Metadata write failed');
    imageRepository.save.mockRejectedValue(databaseError);
    await expect(
      service.updateOwn(
        'user-id',
        'tour-id',
        'review-id',
        { removeImageIds: ['old-image'] },
        [upload],
      ),
    ).rejects.toBe(databaseError);
    expect(storage.removeBestEffort).toHaveBeenCalledWith([stored.storageKey]);
    expect(storage.removeBestEffort).not.toHaveBeenCalledWith([
      'reviews/old.png',
    ]);
  });

  it('keeps existing images in text updates and reads only public image fields', async () => {
    imageRepository.find.mockResolvedValue([existingImage]);
    const response = await service.updateOwn(
      'user-id',
      'tour-id',
      'review-id',
      { body: 'Updated' },
    );
    expect(response.images).toHaveLength(1);
    expect(imageRepository.find).toHaveBeenCalledWith({
      select: [...REVIEW_IMAGE_PUBLIC_QUERY_FIELDS],
      where: { reviewId: 'review-id' },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    expect(response.images[0]).not.toHaveProperty('storageKey');
  });

  it('deletes image metadata and files when deleting a review', async () => {
    imageRepository.find.mockResolvedValue([existingImage]);
    await expect(
      service.removeOwn('user-id', 'tour-id', 'review-id'),
    ).resolves.toMatchObject({ images: [] });
    expect(imageRepository.delete).toHaveBeenCalledWith({
      reviewId: 'review-id',
    });
    expect(storage.removeBestEffort).toHaveBeenCalledWith(['reviews/old.png']);
  });
});
