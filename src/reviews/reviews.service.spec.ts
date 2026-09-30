import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Not } from 'typeorm';
import type { DataSource, Repository } from 'typeorm';
import { TourStatus } from '../tours/constants/tour.constants';
import { TourEntity } from '../tours/entities/tour.entity';
import {
  REVIEW_MANAGEMENT_QUERY_FIELDS,
  REVIEW_PUBLIC_QUERY_FIELDS,
  ReviewStatus,
} from './constants/review.constants';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let existsByMock: jest.Mock;
  let findOneMock: jest.Mock;
  let getManyAndCountMock: jest.Mock;
  let selectMock: jest.Mock;
  let andWhereMock: jest.Mock;
  let orderByMock: jest.Mock;
  let addOrderByMock: jest.Mock;
  let skipMock: jest.Mock;
  let takeMock: jest.Mock;
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
    const queryBuilder = {
      addOrderBy: addOrderByMock,
      andWhere: andWhereMock,
      getManyAndCount: getManyAndCountMock,
      orderBy: orderByMock,
      select: selectMock,
      skip: skipMock,
      take: takeMock,
      where: jest.fn().mockReturnThis(),
    };
    const reviewsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: findOneMock,
      update: updateMock,
    } as unknown as Repository<ReviewEntity>;
    const toursRepository = {
      existsBy: existsByMock,
    } as unknown as Repository<TourEntity>;
    service = new ReviewsService(
      {} as DataSource,
      reviewsRepository,
      toursRepository,
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
