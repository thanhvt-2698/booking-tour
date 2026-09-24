import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CategoryStatus } from '../categories/constants/category.constants';
import { CategoryEntity } from '../categories/entities/category.entity';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { toSlug } from '../common/utils/slug.util';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../database/constants/database.constants';
import {
  TOUR_PUBLIC_FIELDS,
  TOUR_QUERY_FIELDS,
  TourStatus,
} from './constants/tour.constants';
import type { CreateTourDto } from './dto/create-tour.dto';
import type { TourQueryDto } from './dto/tour-query.dto';
import type { TourResponseDto } from './dto/tour-response.dto';
import type { UpdateTourDto } from './dto/update-tour.dto';
import { TourEntity } from './entities/tour.entity';
import type { TourList } from './interfaces/tour-list.interface';

@Injectable()
export class ToursService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
  ) {}

  async findPublic(query: TourQueryDto): Promise<TourList> {
    return this.findMany(query, TourStatus.PUBLISHED);
  }

  async findMany(
    query: TourQueryDto,
    statusOverride?: TourStatus,
  ): Promise<TourList> {
    const toursQuery = this.toursRepository
      .createQueryBuilder('tour')
      .select(TOUR_QUERY_FIELDS)
      .orderBy('tour.created_at', 'DESC')
      .addOrderBy('tour.id', 'DESC')
      .skip(query.offset)
      .take(query.limit);
    const status = statusOverride ?? query.status;

    if (status) {
      toursQuery.andWhere('tour.status = :status', { status });
    }
    if (query.categoryId) {
      toursQuery.andWhere('tour.category_id = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.keyword?.trim()) {
      toursQuery.andWhere(
        '(tour.title ILIKE :keyword OR tour.description ILIKE :keyword OR tour.code ILIKE :keyword)',
        { keyword: `%${query.keyword.trim()}%` },
      );
    }

    const [tours, totalItems] = await toursQuery.getManyAndCount();

    return {
      meta: createPaginationMeta(query.page, query.limit, totalItems),
      tours: tours.map((tour) => this.toResponse(tour)),
    };
  }

  async findById(id: string): Promise<TourResponseDto> {
    return this.toResponse(await this.findRequiredById(id));
  }

  async findPublicById(id: string): Promise<TourResponseDto> {
    return this.toResponse(
      await this.findRequiredById(id, TourStatus.PUBLISHED),
    );
  }

  async create(
    actorId: string,
    input: CreateTourDto,
  ): Promise<TourResponseDto> {
    await this.ensureActiveCategory(input.categoryId);

    const tour = this.toursRepository.create({
      basePrice: this.formatPrice(input.basePrice),
      categoryId: input.categoryId,
      code: this.normalizeCode(input.code),
      createdBy: actorId,
      currency: this.normalizeCurrency(input.currency),
      description: this.normalizeRequired(
        input.description,
        'errors.tourDescriptionRequired',
      ),
      slug: this.normalizeSlug(input.slug ?? input.title),
      status: TourStatus.DRAFT,
      title: this.normalizeRequired(input.title, 'errors.tourTitleRequired'),
    });

    return this.toResponse(await this.saveTour(tour));
  }

  async update(id: string, input: UpdateTourDto): Promise<TourResponseDto> {
    const tour = await this.findRequiredById(id);
    const categoryId = input.categoryId ?? tour.categoryId;

    if (
      input.categoryId !== undefined ||
      input.status === TourStatus.PUBLISHED
    ) {
      await this.ensureActiveCategory(categoryId);
    }

    if (input.basePrice !== undefined) {
      tour.basePrice = this.formatPrice(input.basePrice);
    }
    if (input.categoryId !== undefined) {
      tour.categoryId = input.categoryId;
    }
    if (input.code !== undefined) {
      tour.code = this.normalizeCode(input.code);
    }
    if (input.currency !== undefined) {
      tour.currency = this.normalizeCurrency(input.currency);
    }
    if (input.description !== undefined) {
      tour.description = this.normalizeRequired(
        input.description,
        'errors.tourDescriptionRequired',
      );
    }
    if (input.slug !== undefined) {
      tour.slug = this.normalizeSlug(input.slug);
    }
    if (input.status !== undefined) {
      tour.status = input.status;
    }
    if (input.title !== undefined) {
      tour.title = this.normalizeRequired(
        input.title,
        'errors.tourTitleRequired',
      );
    }

    return this.toResponse(await this.saveTour(tour));
  }

  async archive(id: string): Promise<TourResponseDto> {
    const tour = await this.findRequiredById(id);
    tour.status = TourStatus.ARCHIVED;

    return this.toResponse(await this.saveTour(tour));
  }

  private async findRequiredById(
    id: string,
    status?: TourStatus,
  ): Promise<TourEntity> {
    const tour = await this.toursRepository.findOne({
      select: [...TOUR_PUBLIC_FIELDS],
      where: status ? { id, status } : { id },
    });

    if (!tour) {
      throw new NotFoundException('errors.tourNotFound');
    }

    return tour;
  }

  private async ensureActiveCategory(categoryId: string): Promise<void> {
    const hasActiveCategory = await this.categoriesRepository.existsBy({
      id: categoryId,
      status: CategoryStatus.ACTIVE,
    });

    if (!hasActiveCategory) {
      throw new NotFoundException('errors.tourCategoryNotFound');
    }
  }

  private async saveTour(tour: TourEntity): Promise<TourEntity> {
    try {
      return await this.toursRepository.save(tour);
    } catch (error: unknown) {
      this.throwIfUniqueViolation(error);

      return Promise.reject(
        error instanceof Error
          ? error
          : new Error('Tour persistence failed', { cause: error }),
      );
    }
  }

  private toResponse(tour: TourEntity): TourResponseDto {
    return {
      basePrice: String(tour.basePrice),
      categoryId: tour.categoryId,
      code: tour.code,
      createdAt: tour.createdAt,
      currency: tour.currency,
      description: tour.description,
      id: tour.id,
      slug: tour.slug,
      status: tour.status,
      title: tour.title,
      updatedAt: tour.updatedAt,
    };
  }

  private formatPrice(price: number): string {
    return price.toFixed(2);
  }

  private normalizeCode(code: string): string {
    return this.normalizeRequired(
      code,
      'errors.tourCodeRequired',
    ).toUpperCase();
  }

  private normalizeCurrency(currency = 'VND'): string {
    const normalizedCurrency = this.normalizeRequired(
      currency,
      'errors.tourCurrencyInvalid',
    ).toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      throw new BadRequestException('errors.tourCurrencyInvalid');
    }

    return normalizedCurrency;
  }

  private normalizeRequired(value: string, errorKey: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException(errorKey);
    }

    return normalizedValue;
  }

  private normalizeSlug(value: string): string {
    const slug = toSlug(value);

    if (!slug) {
      throw new BadRequestException('errors.tourSlugInvalid');
    }

    return slug;
  }

  private throwIfUniqueViolation(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === POSTGRES_UNIQUE_VIOLATION_CODE
    ) {
      throw new ConflictException('errors.tourConflict');
    }
  }
}
