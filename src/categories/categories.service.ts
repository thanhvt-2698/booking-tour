import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { toSlug } from '../common/utils/slug.util';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../database/constants/database.constants';
import {
  CATEGORY_PUBLIC_FIELDS,
  CATEGORY_QUERY_FIELDS,
  CategoryStatus,
} from './constants/category.constants';
import type { CategoryQueryDto } from './dto/category-query.dto';
import type { CategoryResponseDto } from './dto/category-response.dto';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './entities/category.entity';
import type { CategoryList } from './interfaces/category-list.interface';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
  ) {}

  async findPublic(query: CategoryQueryDto): Promise<CategoryList> {
    return this.findMany(query, CategoryStatus.ACTIVE);
  }

  async findMany(
    query: CategoryQueryDto,
    statusOverride?: CategoryStatus,
  ): Promise<CategoryList> {
    const categoriesQuery = this.categoriesRepository
      .createQueryBuilder('category')
      .select(CATEGORY_QUERY_FIELDS)
      .orderBy('category.name', 'ASC')
      .addOrderBy('category.id', 'ASC')
      .skip(query.offset)
      .take(query.limit);

    const status = statusOverride ?? query.status;

    if (status) {
      categoriesQuery.andWhere('category.status = :status', {
        status,
      });
    }

    const [categories, totalItems] = await categoriesQuery.getManyAndCount();

    return {
      categories: categories.map((category) => this.toResponse(category)),
      meta: createPaginationMeta(query.page, query.limit, totalItems),
    };
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    return this.toResponse(await this.findRequiredById(id));
  }

  async findPublicById(id: string): Promise<CategoryResponseDto> {
    return this.toResponse(
      await this.findRequiredById(id, CategoryStatus.ACTIVE),
    );
  }

  async create(input: CreateCategoryDto): Promise<CategoryResponseDto> {
    const name = this.normalizeName(input.name);
    const slug = toSlug(input.slug ?? name);

    this.validateSlug(slug);

    const category = this.categoriesRepository.create({
      description: this.normalizeDescription(input.description),
      name,
      slug,
      status: CategoryStatus.ACTIVE,
    });

    return this.toResponse(await this.saveCategory(category));
  }

  async update(
    id: string,
    input: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.findRequiredById(id);

    if (input.description !== undefined) {
      category.description = this.normalizeDescription(input.description);
    }
    if (input.name !== undefined) {
      category.name = this.normalizeName(input.name);
    }
    if (input.slug !== undefined) {
      category.slug = toSlug(input.slug);
      this.validateSlug(category.slug);
    }
    if (input.status !== undefined) {
      category.status = input.status;
    }

    return this.toResponse(await this.saveCategory(category));
  }

  async archive(id: string): Promise<CategoryResponseDto> {
    const category = await this.findRequiredById(id);
    category.status = CategoryStatus.INACTIVE;

    return this.toResponse(await this.saveCategory(category));
  }

  private async findRequiredById(
    id: string,
    status?: CategoryStatus,
  ): Promise<CategoryEntity> {
    const category = await this.categoriesRepository.findOne({
      select: [...CATEGORY_PUBLIC_FIELDS],
      where: status ? { id, status } : { id },
    });

    if (!category) {
      throw new NotFoundException('errors.categoryNotFound');
    }

    return category;
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException('errors.categoryNameRequired');
    }

    return normalizedName;
  }

  private normalizeDescription(description?: string): string | null {
    const normalizedDescription = description?.trim();
    return normalizedDescription || null;
  }

  private validateSlug(slug: string): void {
    if (!slug) {
      throw new BadRequestException('errors.categorySlugInvalid');
    }
  }

  private toResponse(category: CategoryEntity): CategoryResponseDto {
    return {
      createdAt: category.createdAt,
      description: category.description,
      id: category.id,
      name: category.name,
      slug: category.slug,
      status: category.status,
      updatedAt: category.updatedAt,
    };
  }

  private async saveCategory(
    category: CategoryEntity,
  ): Promise<CategoryEntity> {
    try {
      return await this.categoriesRepository.save(category);
    } catch (error: unknown) {
      this.throwIfUniqueViolation(error);
      return Promise.reject(
        error instanceof Error
          ? error
          : new Error('Category persistence failed', { cause: error }),
      );
    }
  }

  private throwIfUniqueViolation(error: unknown): void {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException('errors.categoryConflict');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === POSTGRES_UNIQUE_VIOLATION_CODE
    );
  }
}
