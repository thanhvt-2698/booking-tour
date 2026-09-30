import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import type { Repository } from 'typeorm';
import { CategoryStatus } from '../categories/constants/category.constants';
import { CategoryEntity } from '../categories/entities/category.entity';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { toSlug } from '../common/utils/slug.util';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../database/constants/database.constants';
import { FILE_STORAGE_ERROR_KEYS } from '../files/constants/file.constants';
import { TourImageEntity } from '../files/entities/tour-image.entity';
import { FileStorageService } from '../files/file-storage.service';
import type { UploadedImage } from '../files/interfaces/uploaded-image.interface';
import type { StoredImage } from '../files/interfaces/stored-image.interface';
import { DepartureStatus } from './constants/departure.constants';
import {
  FIRST_TOUR_IMAGE_SORT_ORDER,
  MAX_TOUR_IMAGE_COUNT,
  NEXT_CALENDAR_DAY_OFFSET,
  TOUR_IMAGE_ERROR_KEYS,
  TOUR_IMAGE_FOLDER_NAME,
  TOUR_PUBLIC_FIELDS,
  TOUR_QUERY_FIELDS,
  TOUR_IMAGE_PUBLIC_FIELDS,
  TOUR_IMAGE_MANAGEMENT_FIELDS,
  TOUR_IMAGE_SORT_ORDER_INCREMENT,
  TourStatus,
} from './constants/tour.constants';
import type { CreateTourDto } from './dto/create-tour.dto';
import type { PublicTourQueryDto, TourQueryDto } from './dto/tour-query.dto';
import type {
  TourImageResponseDto,
  TourResponseDto,
} from './dto/tour-response.dto';
import type { UpdateTourDto } from './dto/update-tour.dto';
import { TourEntity } from './entities/tour.entity';
import type { TourDepartureDateBoundaries } from './interfaces/tour-departure-date-boundaries.interface';
import type { TourDepartureDateRange } from './interfaces/tour-departure-date-range.interface';
import type { TourList } from './interfaces/tour-list.interface';

@Injectable()
export class ToursService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    @InjectRepository(TourImageEntity)
    private readonly imagesRepository: Repository<TourImageEntity>,
    private readonly dataSource: DataSource,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async findPublic(query: PublicTourQueryDto): Promise<TourList> {
    return this.findMany(query, TourStatus.PUBLISHED, query);
  }

  async findMany(
    query: TourQueryDto,
    statusOverride?: TourStatus,
    departureRange?: TourDepartureDateRange,
  ): Promise<TourList> {
    const departureDateBoundaries =
      this.getDepartureDateBoundaries(departureRange);
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
    if (departureDateBoundaries) {
      toursQuery.andWhere(
        `EXISTS (
          SELECT 1
          FROM "tour_departures" "departure"
          WHERE "departure"."tour_id" = "tour"."id"
            AND "departure"."status" = :departureStatus
            AND "departure"."booked_seats" < "departure"."capacity"
            AND "departure"."start_at" > CURRENT_TIMESTAMP
            AND (
              "departure"."booking_deadline" IS NULL
              OR "departure"."booking_deadline" > CURRENT_TIMESTAMP
            )
            AND "departure"."start_at" < :departureTo
            AND "departure"."end_at" > :departureFrom
        )`,
        {
          departureFrom: departureDateBoundaries.departureFrom,
          departureStatus: DepartureStatus.OPEN,
          departureTo: departureDateBoundaries.departureTo,
        },
      );
    }

    const [tours, totalItems] = await toursQuery.getManyAndCount();

    const images = await this.findImagesForTours(tours.map((tour) => tour.id));

    return {
      meta: createPaginationMeta(query.page, query.limit, totalItems),
      tours: tours.map((tour) =>
        this.toResponse(
          tour,
          images.filter((image) => image.tourId === tour.id),
        ),
      ),
    };
  }

  private getDepartureDateBoundaries(
    departureRange?: TourDepartureDateRange,
  ): TourDepartureDateBoundaries | undefined {
    if (!departureRange) {
      return undefined;
    }

    const departureFromValue = departureRange.departureFrom;
    const departureToValue = departureRange.departureTo;

    if (departureFromValue === undefined && departureToValue === undefined) {
      return undefined;
    }
    if (departureFromValue === undefined || departureToValue === undefined) {
      throw new BadRequestException('errors.departureSearchRangeIncomplete');
    }

    const departureFrom = new Date(departureFromValue);
    const departureTo = new Date(departureToValue);

    if (
      !this.isValidDate(departureFromValue, departureFrom) ||
      !this.isValidDate(departureToValue, departureTo) ||
      departureFrom > departureTo
    ) {
      throw new BadRequestException('errors.departureSearchRangeInvalid');
    }

    departureTo.setUTCDate(departureTo.getUTCDate() + NEXT_CALENDAR_DAY_OFFSET);

    return { departureFrom, departureTo };
  }

  private isValidDate(value: string, date: Date): boolean {
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    );
  }

  async findById(id: string): Promise<TourResponseDto> {
    const tour = await this.findRequiredById(id);
    return this.toResponse(tour, await this.findImagesForTours([tour.id]));
  }

  async findPublicById(id: string): Promise<TourResponseDto> {
    const tour = await this.findRequiredById(id, TourStatus.PUBLISHED);
    return this.toResponse(tour, await this.findImagesForTours([tour.id]));
  }

  async create(
    actorId: string,
    input: CreateTourDto,
    files: readonly UploadedImage[] = [],
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

    if (files.length === 0) {
      return this.toResponse(await this.saveTour(tour));
    }

    const stored = await this.fileStorageService.store(
      files,
      TOUR_IMAGE_FOLDER_NAME,
      MAX_TOUR_IMAGE_COUNT,
    );
    let savedTour: TourEntity;
    try {
      savedTour = await this.dataSource.transaction(async (manager) => {
        const saved = await manager.save(TourEntity, tour);
        await manager.save(
          TourImageEntity,
          stored.map((image, index) =>
            this.toImageEntity(
              saved.id,
              image,
              FIRST_TOUR_IMAGE_SORT_ORDER +
                index * TOUR_IMAGE_SORT_ORDER_INCREMENT,
            ),
          ),
        );
        return saved;
      });
    } catch (error: unknown) {
      await this.fileStorageService.removeBestEffort(
        stored.map((image) => image.storageKey),
      );
      this.throwIfUniqueViolation(error);
      throw error;
    }

    return this.findById(savedTour.id);
  }

  async update(
    id: string,
    input: UpdateTourDto,
    files: readonly UploadedImage[] = [],
  ): Promise<TourResponseDto> {
    const tour = await this.findRequiredById(id);
    const removeImageIds = input.removeImageIds ?? [];
    if (new Set(removeImageIds).size !== removeImageIds.length) {
      throw new BadRequestException(TOUR_IMAGE_ERROR_KEYS.invalidImage);
    }
    const existingImages = await this.findImagesForTours([id]);
    this.validateImageChange(existingImages, removeImageIds, files.length);
    await this.applyUpdate(tour, input);

    if (files.length === 0 && removeImageIds.length === 0) {
      return this.toResponse(await this.saveTour(tour), existingImages);
    }

    const stored =
      files.length > 0
        ? await this.fileStorageService.store(
            files,
            TOUR_IMAGE_FOLDER_NAME,
            MAX_TOUR_IMAGE_COUNT,
          )
        : [];
    let removedStorageKeys: string[] = [];
    try {
      await this.dataSource.transaction(async (manager) => {
        const lockedTour = await manager.findOne(TourEntity, {
          select: [...TOUR_PUBLIC_FIELDS],
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedTour) {
          throw new NotFoundException('errors.tourNotFound');
        }
        const lockedImages = await manager.find(TourImageEntity, {
          select: [...TOUR_IMAGE_MANAGEMENT_FIELDS],
          where: { tourId: id },
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
        this.validateImageChange(lockedImages, removeImageIds, files.length);
        await this.applyUpdate(lockedTour, input);
        await manager.save(TourEntity, lockedTour);
        const removedImages = lockedImages.filter((image) =>
          removeImageIds.includes(image.id),
        );
        removedStorageKeys = removedImages.map((image) => image.storageKey);
        if (removeImageIds.length > 0) {
          await manager.delete(TourImageEntity, {
            id: In(removeImageIds),
            tourId: id,
          });
        }
        if (stored.length > 0) {
          const nextSortOrder =
            lockedImages.length === 0
              ? FIRST_TOUR_IMAGE_SORT_ORDER
              : Math.max(...lockedImages.map((image) => image.sortOrder)) +
                TOUR_IMAGE_SORT_ORDER_INCREMENT;
          await manager.save(
            TourImageEntity,
            stored.map((image, index) =>
              this.toImageEntity(id, image, nextSortOrder + index),
            ),
          );
        }
      });
    } catch (error: unknown) {
      await this.fileStorageService.removeBestEffort(
        stored.map((image) => image.storageKey),
      );
      this.throwIfUniqueViolation(error);
      throw error;
    }
    await this.fileStorageService.removeBestEffort(removedStorageKeys);
    return this.findById(id);
  }

  private async applyUpdate(
    tour: TourEntity,
    input: UpdateTourDto,
  ): Promise<void> {
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
  }

  async archive(id: string): Promise<TourResponseDto> {
    const tour = await this.findRequiredById(id);
    tour.status = TourStatus.ARCHIVED;

    return this.toResponse(
      await this.saveTour(tour),
      await this.findImagesForTours([id]),
    );
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

  private async findImagesForTours(
    tourIds: string[],
  ): Promise<TourImageEntity[]> {
    if (tourIds.length === 0) {
      return [];
    }

    return this.imagesRepository.find({
      select: [...TOUR_IMAGE_PUBLIC_FIELDS],
      where: { tourId: In(tourIds) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  private validateImageChange(
    existingImages: TourImageEntity[],
    removeImageIds: string[],
    incomingCount: number,
  ): void {
    const existingIds = new Set(existingImages.map((image) => image.id));
    if (removeImageIds.some((id) => !existingIds.has(id))) {
      throw new BadRequestException(TOUR_IMAGE_ERROR_KEYS.invalidImage);
    }
    if (
      existingImages.length - removeImageIds.length + incomingCount >
      MAX_TOUR_IMAGE_COUNT
    ) {
      throw new BadRequestException(FILE_STORAGE_ERROR_KEYS.tooManyImages);
    }
  }

  private toImageEntity(
    tourId: string,
    image: StoredImage,
    sortOrder: number,
  ): TourImageEntity {
    return this.imagesRepository.create({
      mimeType: image.mimeType,
      originalName: image.originalName,
      sizeBytes: image.sizeBytes,
      sortOrder,
      storageKey: image.storageKey,
      tourId,
      url: image.url,
    });
  }

  private toResponse(
    tour: TourEntity,
    images: TourImageEntity[] = [],
  ): TourResponseDto {
    return {
      basePrice: String(tour.basePrice),
      categoryId: tour.categoryId,
      code: tour.code,
      createdAt: tour.createdAt,
      currency: tour.currency,
      description: tour.description,
      id: tour.id,
      images: images.map((image): TourImageResponseDto => ({
        id: image.id,
        sortOrder: image.sortOrder,
        url: image.url,
      })),
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
