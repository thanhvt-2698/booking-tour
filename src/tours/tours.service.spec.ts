import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../database/constants/database.constants';
import { CategoryStatus } from '../categories/constants/category.constants';
import { DepartureStatus } from './constants/departure.constants';
import { TourStatus } from './constants/tour.constants';
import { PublicTourQueryDto } from './dto/tour-query.dto';
import { TourEntity } from './entities/tour.entity';
import { ToursService } from './tours.service';
import { CategoryEntity } from '../categories/entities/category.entity';

describe('ToursService', () => {
  let categoriesRepository: jest.Mocked<Repository<CategoryEntity>>;
  let toursRepository: jest.Mocked<Repository<TourEntity>>;
  let service: ToursService;
  let createMock: jest.Mock;
  let existsCategoryMock: jest.Mock;
  let findOneTourMock: jest.Mock;
  let saveMock: jest.Mock;
  let createQueryBuilderMock: jest.Mock;

  const tour = {
    basePrice: '1500000.00',
    categoryId: 'category-id',
    code: 'DN-001',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    currency: 'VND',
    description: 'Beach tour',
    id: 'tour-id',
    slug: 'da-nang-beach-tour',
    status: TourStatus.PUBLISHED,
    title: 'Da Nang Beach Tour',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  } as TourEntity;

  beforeEach(() => {
    createMock = jest.fn();
    existsCategoryMock = jest.fn();
    findOneTourMock = jest.fn();
    saveMock = jest.fn();
    createQueryBuilderMock = jest.fn();
    categoriesRepository = {
      existsBy: existsCategoryMock,
    } as unknown as jest.Mocked<Repository<CategoryEntity>>;
    toursRepository = {
      create: createMock,
      createQueryBuilder: createQueryBuilderMock,
      findOne: findOneTourMock,
      save: saveMock,
    } as unknown as jest.Mocked<Repository<TourEntity>>;
    service = new ToursService(categoriesRepository, toursRepository);
  });

  it('creates a draft tour with normalized values', async () => {
    existsCategoryMock.mockResolvedValue(true);
    createMock.mockImplementation((input: Partial<TourEntity>) => ({
      ...tour,
      ...input,
    }));
    saveMock.mockImplementation((savedTour: TourEntity) =>
      Promise.resolve(savedTour),
    );

    await expect(
      service.create('admin-id', {
        basePrice: 1500000,
        categoryId: tour.categoryId,
        code: ' dn-001 ',
        description: ' Beach tour ',
        title: ' Tour Đà Nẵng ',
      }),
    ).resolves.toMatchObject({
      id: tour.id,
      slug: 'tour-da-nang',
    });

    expect(existsCategoryMock).toHaveBeenCalledWith({
      id: tour.categoryId,
      status: CategoryStatus.ACTIVE,
    });
    expect(createMock).toHaveBeenCalledWith({
      basePrice: '1500000.00',
      categoryId: tour.categoryId,
      code: 'DN-001',
      createdBy: 'admin-id',
      currency: 'VND',
      description: 'Beach tour',
      slug: 'tour-da-nang',
      status: TourStatus.DRAFT,
      title: 'Tour Đà Nẵng',
    });
  });

  it('selects only response fields for a tour detail', async () => {
    findOneTourMock.mockResolvedValue(tour);

    await service.findById(tour.id);

    expect(findOneTourMock).toHaveBeenCalledWith({
      select: [
        'id',
        'categoryId',
        'code',
        'slug',
        'title',
        'description',
        'basePrice',
        'currency',
        'status',
        'createdAt',
        'updatedAt',
      ],
      where: { id: tour.id },
    });
  });

  it('selects only response fields and forces published status publicly', async () => {
    const andWhereMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const queryBuilder = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: andWhereMock,
      getManyAndCount: jest.fn().mockResolvedValue([[tour], 1]),
      orderBy: jest.fn().mockReturnThis(),
      select: selectMock,
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TourEntity>>;
    createQueryBuilderMock.mockReturnValue(queryBuilder);

    await service.findPublic(new PublicTourQueryDto());

    expect(selectMock).toHaveBeenCalledWith([
      'tour.id',
      'tour.categoryId',
      'tour.code',
      'tour.slug',
      'tour.title',
      'tour.description',
      'tour.basePrice',
      'tour.currency',
      'tour.status',
      'tour.createdAt',
      'tour.updatedAt',
    ]);
    expect(andWhereMock).toHaveBeenCalledWith('tour.status = :status', {
      status: TourStatus.PUBLISHED,
    });
  });

  it('searches available departures in an inclusive calendar-date range', async () => {
    const andWhereMock = jest.fn().mockReturnThis();
    const queryBuilder = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: andWhereMock,
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TourEntity>>;
    createQueryBuilderMock.mockReturnValue(queryBuilder);
    const query = new PublicTourQueryDto();
    query.departureFrom = '2030-07-01';
    query.departureTo = '2030-07-08';

    await service.findPublic(query);

    expect(andWhereMock).toHaveBeenCalledWith(
      expect.stringContaining('"departure"."start_at" < :departureTo'),
      {
        departureFrom: new Date('2030-07-01T00:00:00.000Z'),
        departureStatus: DepartureStatus.OPEN,
        departureTo: new Date('2030-07-09T00:00:00.000Z'),
      },
    );
    expect(andWhereMock).toHaveBeenCalledWith(
      expect.stringContaining('"departure"."end_at" > :departureFrom'),
      expect.any(Object),
    );
    expect(andWhereMock).toHaveBeenCalledWith('tour.status = :status', {
      status: TourStatus.PUBLISHED,
    });
  });

  it('requires both date range bounds and rejects a reversed range', async () => {
    const incompleteQuery = new PublicTourQueryDto();
    incompleteQuery.departureFrom = '2030-07-01';

    await expect(service.findPublic(incompleteQuery)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createQueryBuilderMock).not.toHaveBeenCalled();

    const invalidQuery = new PublicTourQueryDto();
    invalidQuery.departureFrom = '2030-07-08';
    invalidQuery.departureTo = '2030-07-01';

    await expect(service.findPublic(invalidQuery)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createQueryBuilderMock).not.toHaveBeenCalled();

    const nonexistentDateQuery = new PublicTourQueryDto();
    nonexistentDateQuery.departureFrom = '2030-02-30';
    nonexistentDateQuery.departureTo = '2030-03-01';

    await expect(
      service.findPublic(nonexistentDateQuery),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createQueryBuilderMock).not.toHaveBeenCalled();
  });

  it('allows a single calendar day', async () => {
    const andWhereMock = jest.fn().mockReturnThis();
    const queryBuilder = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: andWhereMock,
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<TourEntity>>;
    createQueryBuilderMock.mockReturnValue(queryBuilder);
    const singleDayQuery = new PublicTourQueryDto();
    singleDayQuery.departureFrom = '2030-07-01';
    singleDayQuery.departureTo = '2030-07-01';

    await expect(service.findPublic(singleDayQuery)).resolves.toMatchObject({
      meta: { totalItems: 0 },
    });
    expect(andWhereMock).toHaveBeenCalledWith(
      expect.stringContaining('"departure"."start_at" < :departureTo'),
      expect.objectContaining({
        departureFrom: new Date('2030-07-01T00:00:00.000Z'),
        departureTo: new Date('2030-07-02T00:00:00.000Z'),
      }),
    );
  });

  it('maps duplicate code or slug to conflict', async () => {
    existsCategoryMock.mockResolvedValue(true);
    createMock.mockReturnValue(tour);
    saveMock.mockRejectedValue({ code: POSTGRES_UNIQUE_VIOLATION_CODE });

    await expect(
      service.create('admin-id', {
        basePrice: 1500000,
        categoryId: tour.categoryId,
        code: 'DN-001',
        description: 'Beach tour',
        title: 'Da Nang Beach Tour',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a title that cannot produce a slug', async () => {
    existsCategoryMock.mockResolvedValue(true);

    await expect(
      service.create('admin-id', {
        basePrice: 1500000,
        categoryId: tour.categoryId,
        code: 'DN-001',
        description: 'Beach tour',
        title: '---',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createMock).not.toHaveBeenCalled();
  });
});
