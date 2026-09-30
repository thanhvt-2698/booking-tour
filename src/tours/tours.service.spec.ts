import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../database/constants/database.constants';
import { CategoryStatus } from '../categories/constants/category.constants';
import { DepartureStatus } from './constants/departure.constants';
import {
  TOUR_IMAGE_MANAGEMENT_FIELDS,
  TOUR_PUBLIC_FIELDS,
  TourStatus,
} from './constants/tour.constants';
import { PublicTourQueryDto } from './dto/tour-query.dto';
import { TourEntity } from './entities/tour.entity';
import { ToursService } from './tours.service';
import { CategoryEntity } from '../categories/entities/category.entity';
import { In } from 'typeorm';
import type { DataSource } from 'typeorm';
import type { FileStorageService } from '../files/file-storage.service';
import { TourImageEntity } from '../files/entities/tour-image.entity';
import { MAX_TOUR_IMAGE_COUNT } from '../files/constants/file.constants';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';

describe('ToursService', () => {
  let categoriesRepository: jest.Mocked<Repository<CategoryEntity>>;
  let toursRepository: jest.Mocked<Repository<TourEntity>>;
  let service: ToursService;
  let createMock: jest.Mock;
  let existsCategoryMock: jest.Mock;
  let findOneTourMock: jest.Mock;
  let saveMock: jest.Mock;
  let createQueryBuilderMock: jest.Mock;
  let imagesFindMock: jest.Mock;
  let transactionMock: jest.Mock;
  let storageMock: jest.Mock;
  let cleanupMock: jest.Mock;
  let managerSaveMock: jest.Mock;
  let managerFindMock: jest.Mock;
  let managerFindOneMock: jest.Mock;
  let managerDeleteMock: jest.Mock;

  const image = {
    id: 'image-id',
    tourId: 'tour-id',
    url: '/uploads/tours/image.png',
    storageKey: 'tours/image.png',
    sortOrder: 0,
  } as TourImageEntity;
  const upload: UploadedImage = {
    buffer: Buffer.from('image'),
    mimetype: 'image/png',
    originalname: 'image.png',
    size: 5,
  };
  const storedImage = {
    mimeType: 'image/png',
    originalName: 'new.png',
    sizeBytes: 5,
    storageKey: 'tours/new.png',
    url: '/uploads/tours/new.png',
  };
  const createInput = {
    basePrice: 1500000,
    categoryId: 'category-id',
    code: 'DN-001',
    description: 'Beach tour',
    title: 'Da Nang Beach Tour',
  };

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
    imagesFindMock = jest.fn().mockResolvedValue([]);
    storageMock = jest.fn().mockResolvedValue([storedImage]);
    cleanupMock = jest.fn().mockResolvedValue(undefined);
    managerSaveMock = jest.fn().mockResolvedValue(tour);
    managerFindMock = jest.fn().mockResolvedValue([]);
    managerFindOneMock = jest.fn().mockResolvedValue({ ...tour });
    managerDeleteMock = jest.fn().mockResolvedValue({ affected: 1 });
    transactionMock = jest
      .fn()
      .mockImplementation((callback: (manager: unknown) => Promise<unknown>) =>
        callback({
          save: managerSaveMock,
          find: managerFindMock,
          findOne: managerFindOneMock,
          delete: managerDeleteMock,
        }),
      );
    categoriesRepository = {
      existsBy: existsCategoryMock,
    } as unknown as jest.Mocked<Repository<CategoryEntity>>;
    toursRepository = {
      create: createMock,
      createQueryBuilder: createQueryBuilderMock,
      findOne: findOneTourMock,
      save: saveMock,
    } as unknown as jest.Mocked<Repository<TourEntity>>;
    service = new ToursService(
      categoriesRepository,
      toursRepository,
      {
        find: imagesFindMock,
        create: jest.fn().mockImplementation((input: unknown) => input),
      } as unknown as Repository<TourImageEntity>,
      { transaction: transactionMock } as unknown as DataSource,
      {
        store: storageMock,
        removeBestEffort: cleanupMock,
      } as unknown as FileStorageService,
    );
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
    expect(imagesFindMock).toHaveBeenCalledWith({
      select: ['id', 'tourId', 'url', 'sortOrder'],
      where: { tourId: In([tour.id]) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
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

  it('persists a new tour and uploaded image metadata in one transaction', async () => {
    existsCategoryMock.mockResolvedValue(true);
    createMock.mockReturnValue(tour);
    findOneTourMock.mockResolvedValue(tour);
    imagesFindMock.mockResolvedValue([image]);

    await expect(
      service.create('admin-id', createInput, [upload]),
    ).resolves.toMatchObject({
      images: [{ id: image.id, url: image.url, sortOrder: 0 }],
    });

    expect(storageMock).toHaveBeenCalledWith(
      [upload],
      'tours',
      MAX_TOUR_IMAGE_COUNT,
    );
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(managerSaveMock).toHaveBeenNthCalledWith(1, TourEntity, tour);
    expect(managerSaveMock).toHaveBeenNthCalledWith(2, TourImageEntity, [
      {
        ...storedImage,
        mimeType: storedImage.mimeType,
        originalName: storedImage.originalName,
        sizeBytes: 5,
        tourId: tour.id,
        sortOrder: 0,
      },
    ]);
    expect(cleanupMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('cleans uploaded files when saving image metadata fails and maps conflicts', async () => {
    existsCategoryMock.mockResolvedValue(true);
    createMock.mockReturnValue(tour);
    managerSaveMock
      .mockResolvedValueOnce(tour)
      .mockRejectedValueOnce({ code: POSTGRES_UNIQUE_VIOLATION_CODE });

    await expect(
      service.create('admin-id', createInput, [upload]),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(cleanupMock).toHaveBeenCalledWith([storedImage.storageKey]);
    expect(findOneTourMock).not.toHaveBeenCalled();
  });

  it('does not write a tour when image storage fails', async () => {
    existsCategoryMock.mockResolvedValue(true);
    createMock.mockReturnValue(tour);
    storageMock.mockRejectedValue(
      new BadRequestException('errors.imageInvalid'),
    );

    await expect(
      service.create('admin-id', createInput, [upload]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('locks the tour before replacing image metadata and removes old files after commit', async () => {
    findOneTourMock.mockResolvedValue({ ...tour });
    imagesFindMock.mockResolvedValueOnce([image]).mockResolvedValueOnce([]);
    managerFindMock.mockResolvedValue([image]);

    await service.update(
      tour.id,
      { title: 'Updated tour', removeImageIds: [image.id] },
      [upload],
    );

    expect(managerFindOneMock).toHaveBeenCalledWith(
      TourEntity,
      expect.objectContaining({
        select: [...TOUR_PUBLIC_FIELDS],
        where: { id: tour.id },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    expect(managerFindMock).toHaveBeenCalledWith(
      TourImageEntity,
      expect.objectContaining({
        select: [...TOUR_IMAGE_MANAGEMENT_FIELDS],
        where: { tourId: tour.id },
      }),
    );
    expect(managerDeleteMock).toHaveBeenCalledWith(
      TourImageEntity,
      expect.objectContaining({ tourId: tour.id }),
    );
    expect(managerSaveMock).toHaveBeenNthCalledWith(
      1,
      TourEntity,
      expect.objectContaining({ title: 'Updated tour' }),
    );
    expect(cleanupMock).toHaveBeenCalledWith([image.storageKey]);
    expect(cleanupMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      managerSaveMock.mock.invocationCallOrder[1],
    );
  });

  it('keeps old files and cleans only incoming files when an update transaction fails', async () => {
    findOneTourMock.mockResolvedValue({ ...tour });
    imagesFindMock.mockResolvedValue([image]);
    managerFindMock.mockResolvedValue([image]);
    const failure = new Error('metadata write failed');
    managerSaveMock.mockResolvedValueOnce(tour).mockRejectedValueOnce(failure);

    await expect(
      service.update(tour.id, { removeImageIds: [image.id] }, [upload]),
    ).rejects.toThrow(failure);
    expect(cleanupMock).toHaveBeenCalledTimes(1);
    expect(cleanupMock).toHaveBeenCalledWith([storedImage.storageKey]);
  });

  it('rejects duplicate or foreign removals and a total above the image limit before storage', async () => {
    findOneTourMock.mockResolvedValue({ ...tour });
    imagesFindMock.mockResolvedValue([image]);

    await expect(
      service.update(tour.id, { removeImageIds: [image.id, image.id] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update(tour.id, { removeImageIds: ['foreign-image'] }, [upload]),
    ).rejects.toBeInstanceOf(BadRequestException);
    imagesFindMock.mockResolvedValue(
      Array.from({ length: MAX_TOUR_IMAGE_COUNT }, (_, index) => ({
        ...image,
        id: `image-${index}`,
      })),
    );
    await expect(service.update(tour.id, {}, [upload])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(storageMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rechecks image limits under lock to reject a concurrent upload and cleans incoming files', async () => {
    findOneTourMock.mockResolvedValue({ ...tour });
    imagesFindMock.mockResolvedValue([]);
    managerFindMock.mockResolvedValue(
      Array.from({ length: MAX_TOUR_IMAGE_COUNT }, (_, index) => ({
        ...image,
        id: `image-${index}`,
      })),
    );

    await expect(service.update(tour.id, {}, [upload])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(cleanupMock).toHaveBeenCalledWith([storedImage.storageKey]);
    expect(managerSaveMock).not.toHaveBeenCalled();
  });
});
