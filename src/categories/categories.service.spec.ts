import { BadRequestException, ConflictException, Logger } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../database/constants/database.constants';
import { CategoryStatus } from './constants/category.constants';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryEntity } from './entities/category.entity';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let repository: jest.Mocked<Repository<CategoryEntity>>;
  let service: CategoriesService;
  let createMock: jest.Mock;
  let findOneMock: jest.Mock;
  let saveMock: jest.Mock;
  let createQueryBuilderMock: jest.Mock;

  const category = {
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    description: 'Beach tours',
    id: 'category-id',
    name: 'Beach Tours',
    slug: 'beach-tours',
    status: CategoryStatus.ACTIVE,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  } as CategoryEntity;

  beforeEach(() => {
    createMock = jest.fn();
    findOneMock = jest.fn();
    saveMock = jest.fn();
    createQueryBuilderMock = jest.fn();
    repository = {
      create: createMock,
      findOne: findOneMock,
      createQueryBuilder: createQueryBuilderMock,
      save: saveMock,
    } as unknown as jest.Mocked<Repository<CategoryEntity>>;
    service = new CategoriesService(repository, new Logger());
  });

  it('creates a category with a normalized slug and maps the response', async () => {
    createMock.mockReturnValue(category);
    saveMock.mockResolvedValue(category);

    await expect(service.create({ name: '  Beach Tours  ' })).resolves.toEqual({
      createdAt: category.createdAt,
      description: category.description,
      id: category.id,
      name: category.name,
      slug: category.slug,
      status: category.status,
      updatedAt: category.updatedAt,
    });

    expect(createMock).toHaveBeenCalledWith({
      description: null,
      name: 'Beach Tours',
      slug: 'beach-tours',
      status: CategoryStatus.ACTIVE,
    });
  });

  it('selects only response fields when finding a category', async () => {
    findOneMock.mockResolvedValue(category);

    await service.findById(category.id);

    expect(findOneMock).toHaveBeenCalledWith({
      select: [
        'id',
        'name',
        'slug',
        'description',
        'status',
        'createdAt',
        'updatedAt',
      ],
      where: { id: category.id },
    });
  });

  it('selects only response fields and filters active categories publicly', async () => {
    const andWhereMock = jest.fn().mockReturnThis();
    const selectMock = jest.fn().mockReturnThis();
    const queryBuilder = {
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: andWhereMock,
      getManyAndCount: jest.fn().mockResolvedValue([[category], 1]),
      orderBy: jest.fn().mockReturnThis(),
      select: selectMock,
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<CategoryEntity>>;
    createQueryBuilderMock.mockReturnValue(queryBuilder);

    await service.findPublic(new CategoryQueryDto());

    expect(selectMock).toHaveBeenCalledWith([
      'category.id',
      'category.name',
      'category.slug',
      'category.description',
      'category.status',
      'category.createdAt',
      'category.updatedAt',
    ]);
    expect(andWhereMock).toHaveBeenCalledWith('category.status = :status', {
      status: CategoryStatus.ACTIVE,
    });
  });

  it('maps unique constraint violations to conflict', async () => {
    createMock.mockReturnValue(category);
    saveMock.mockRejectedValue({
      code: POSTGRES_UNIQUE_VIOLATION_CODE,
    });

    await expect(
      service.create({ name: 'Beach Tours' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a category name that cannot produce a slug', async () => {
    await expect(service.create({ name: '---' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createMock).not.toHaveBeenCalled();
  });
});
