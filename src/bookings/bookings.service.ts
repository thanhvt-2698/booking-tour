import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Repository } from 'typeorm';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { POSTGRES_UNIQUE_VIOLATION_CODE } from '../database/constants/database.constants';
import { DepartureStatus } from '../tours/constants/departure.constants';
import { TourStatus } from '../tours/constants/tour.constants';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import {
  BOOKING_CODE_PREFIX,
  BOOKING_CODE_RANDOM_PART_LENGTH,
  BOOKING_DEPARTURE_QUERY_FIELDS,
  BOOKING_MONEY_DECIMAL_SEPARATOR,
  BOOKING_MONEY_FRACTION_DIGITS,
  BOOKING_MONEY_MINIMUM_DIGITS,
  BOOKING_MONEY_ZERO,
  BOOKING_PUBLIC_FIELDS,
  BOOKING_QUERY_FIELDS,
  BOOKING_SEAT_BALANCE_QUERY_FIELDS,
  BOOKING_TOUR_FIELDS,
  BookingStatus,
  IDEMPOTENCY_KEY_MAX_LENGTH,
} from './constants/booking.constants';
import type { BookingQueryDto } from './dto/booking-query.dto';
import type { BookingResponseDto } from './dto/booking-response.dto';
import type { CancelBookingDto } from './dto/cancel-booking.dto';
import type { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatusHistoryEntity } from './entities/booking-status-history.entity';
import { BookingEntity } from './entities/booking.entity';
import type { BookingList } from './interfaces/booking-list.interface';

@Injectable()
export class BookingsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
  ) {}

  async create(
    userId: string,
    idempotencyKey: string | undefined,
    input: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const bookingRepository = manager.getRepository(BookingEntity);
        const existingBooking = await bookingRepository.findOne({
          select: [...BOOKING_PUBLIC_FIELDS],
          where: { idempotencyKey: normalizedKey, userId },
        });

        if (existingBooking) {
          return this.getIdempotentResponse(existingBooking, input);
        }

        const departure = await manager
          .getRepository(TourDepartureEntity)
          .createQueryBuilder('departure')
          .setLock('pessimistic_write')
          .select(BOOKING_DEPARTURE_QUERY_FIELDS)
          .where('departure.id = :departureId', {
            departureId: input.departureId,
          })
          .getOne();

        this.ensureDepartureIsBookable(departure, input.quantity);

        const tour = await manager.getRepository(TourEntity).findOne({
          select: [...BOOKING_TOUR_FIELDS],
          where: { id: departure.tourId, status: TourStatus.PUBLISHED },
        });

        if (!tour) {
          throw new NotFoundException('errors.tourNotFound');
        }

        departure.bookedSeats += input.quantity;
        await manager.getRepository(TourDepartureEntity).save(departure);

        const booking = await bookingRepository.save(
          bookingRepository.create({
            bookingCode: this.createBookingCode(),
            cancelReason: null,
            currency: tour.currency,
            departureId: departure.id,
            idempotencyKey: normalizedKey,
            quantity: input.quantity,
            status: BookingStatus.PENDING,
            totalAmount: this.calculateTotal(tour.basePrice, input.quantity),
            unitPrice: tour.basePrice,
            userId,
          }),
        );

        await manager.getRepository(BookingStatusHistoryEntity).save(
          manager.getRepository(BookingStatusHistoryEntity).create({
            actorUserId: userId,
            bookingId: booking.id,
            fromStatus: null,
            reason: null,
            toStatus: BookingStatus.PENDING,
          }),
        );

        return this.toResponse(booking);
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        return this.findIdempotentResponse(userId, normalizedKey, input);
      }

      throw error;
    }
  }

  async findMine(userId: string, query: BookingQueryDto): Promise<BookingList> {
    const bookingsQuery = this.bookingsRepository
      .createQueryBuilder('booking')
      .select(BOOKING_QUERY_FIELDS)
      .where('booking.user_id = :userId', { userId })
      .orderBy('booking.created_at', 'DESC')
      .addOrderBy('booking.id', 'DESC')
      .skip(query.offset)
      .take(query.limit);

    if (query.status) {
      bookingsQuery.andWhere('booking.status = :status', {
        status: query.status,
      });
    }

    const [bookings, totalItems] = await bookingsQuery.getManyAndCount();

    return {
      bookings: bookings.map((booking) => this.toResponse(booking)),
      meta: createPaginationMeta(query.page, query.limit, totalItems),
    };
  }

  async findMineById(
    userId: string,
    bookingId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsRepository.findOne({
      select: [...BOOKING_PUBLIC_FIELDS],
      where: { id: bookingId, userId },
    });

    if (!booking) {
      throw new NotFoundException('errors.bookingNotFound');
    }

    return this.toResponse(booking);
  }

  async cancel(
    userId: string,
    bookingId: string,
    input: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(BookingEntity);
      const booking = await bookingRepository
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .select(BOOKING_QUERY_FIELDS)
        .where('booking.id = :bookingId AND booking.user_id = :userId', {
          bookingId,
          userId,
        })
        .getOne();

      if (!booking) {
        throw new NotFoundException('errors.bookingNotFound');
      }
      if (booking.status === BookingStatus.CANCELLED) {
        return this.toResponse(booking);
      }
      if (booking.status !== BookingStatus.PENDING) {
        throw new ConflictException('errors.bookingNotCancellable');
      }

      const departureRepository = manager.getRepository(TourDepartureEntity);
      const departure = await departureRepository
        .createQueryBuilder('departure')
        .setLock('pessimistic_write')
        .select(BOOKING_SEAT_BALANCE_QUERY_FIELDS)
        .where('departure.id = :departureId', {
          departureId: booking.departureId,
        })
        .getOne();

      if (!departure) {
        throw new NotFoundException('errors.departureNotFound');
      }
      if (departure.bookedSeats < booking.quantity) {
        throw new ConflictException('errors.bookingDepartureSeatInconsistent');
      }

      departure.bookedSeats -= booking.quantity;
      booking.cancelReason = this.normalizeCancellationReason(input.reason);
      booking.status = BookingStatus.CANCELLED;
      await departureRepository.save(departure);
      const savedBooking = await bookingRepository.save(booking);
      const statusHistoryRepository = manager.getRepository(
        BookingStatusHistoryEntity,
      );

      await statusHistoryRepository.save(
        statusHistoryRepository.create({
          actorUserId: userId,
          bookingId: savedBooking.id,
          fromStatus: BookingStatus.PENDING,
          reason: savedBooking.cancelReason,
          toStatus: BookingStatus.CANCELLED,
        }),
      );

      return this.toResponse(savedBooking);
    });
  }

  private calculateTotal(unitPrice: string, quantity: number): string {
    const [majorUnits, fractionalUnits = ''] = unitPrice.split(
      BOOKING_MONEY_DECIMAL_SEPARATOR,
    );
    const normalizedFractionalUnits = fractionalUnits
      .padEnd(BOOKING_MONEY_FRACTION_DIGITS, BOOKING_MONEY_ZERO)
      .slice(0, BOOKING_MONEY_FRACTION_DIGITS);
    const totalMinorUnits =
      BigInt(`${majorUnits}${normalizedFractionalUnits}`) * BigInt(quantity);
    const formattedTotal = totalMinorUnits
      .toString()
      .padStart(BOOKING_MONEY_MINIMUM_DIGITS, BOOKING_MONEY_ZERO);
    const decimalPosition =
      formattedTotal.length - BOOKING_MONEY_FRACTION_DIGITS;

    return `${formattedTotal.slice(0, decimalPosition)}${BOOKING_MONEY_DECIMAL_SEPARATOR}${formattedTotal.slice(decimalPosition)}`;
  }

  private createBookingCode(): string {
    return `${BOOKING_CODE_PREFIX}${randomUUID()
      .replaceAll('-', '')
      .slice(0, BOOKING_CODE_RANDOM_PART_LENGTH)
      .toUpperCase()}`;
  }

  private ensureDepartureIsBookable(
    departure: TourDepartureEntity | null,
    quantity: number,
  ): asserts departure is TourDepartureEntity {
    if (!departure) {
      throw new NotFoundException('errors.departureNotFound');
    }
    if (departure.status !== DepartureStatus.OPEN) {
      throw new ConflictException('errors.bookingDepartureNotOpen');
    }
    if (departure.startAt.getTime() <= Date.now()) {
      throw new ConflictException('errors.bookingDepartureStarted');
    }
    if (
      departure.bookingDeadline !== null &&
      departure.bookingDeadline.getTime() <= Date.now()
    ) {
      throw new ConflictException('errors.bookingDeadlineExpired');
    }
    if (departure.bookedSeats + quantity > departure.capacity) {
      throw new ConflictException('errors.bookingNotEnoughSeats');
    }
  }

  private async findIdempotentResponse(
    userId: string,
    idempotencyKey: string,
    input: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsRepository.findOne({
      select: [...BOOKING_PUBLIC_FIELDS],
      where: { idempotencyKey, userId },
    });

    if (!booking) {
      throw new ConflictException('errors.bookingIdempotencyConflict');
    }

    return this.getIdempotentResponse(booking, input);
  }

  private getIdempotentResponse(
    booking: BookingEntity,
    input: CreateBookingDto,
  ): BookingResponseDto {
    if (
      booking.departureId !== input.departureId ||
      booking.quantity !== input.quantity
    ) {
      throw new ConflictException('errors.bookingIdempotencyConflict');
    }

    return this.toResponse(booking);
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === POSTGRES_UNIQUE_VIOLATION_CODE
    );
  }

  private normalizeIdempotencyKey(value: string | undefined): string {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      throw new BadRequestException('errors.bookingIdempotencyKeyRequired');
    }
    if (normalizedValue.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
      throw new BadRequestException('errors.bookingIdempotencyKeyInvalid');
    }

    return normalizedValue;
  }

  private normalizeCancellationReason(
    value: string | undefined,
  ): string | null {
    return value?.trim() || null;
  }

  private toResponse(booking: BookingEntity): BookingResponseDto {
    return {
      bookingCode: booking.bookingCode,
      cancelReason: booking.cancelReason,
      createdAt: booking.createdAt,
      currency: booking.currency,
      departureId: booking.departureId,
      id: booking.id,
      quantity: booking.quantity,
      status: booking.status,
      totalAmount: String(booking.totalAmount),
      unitPrice: String(booking.unitPrice),
      updatedAt: booking.updatedAt,
    };
  }
}
