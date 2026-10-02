import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createPaginationMeta } from '../common/dto/pagination-response.dto';
import { AdminBookingPersistenceService } from './admin-booking-persistence.service';
import { BookingEventsService } from './booking-events.service';
import {
  ADMIN_BOOKING_NEXT_CALENDAR_DAY_OFFSET,
  ADMIN_BOOKING_UTC_DAY_START_SUFFIX,
} from './constants/admin-booking.constants';
import { BookingStatus } from './constants/booking.constants';
import type { AdminBookingActionDto } from './dto/admin-booking-action.dto';
import type { AdminBookingQueryDto } from './dto/admin-booking-query.dto';
import type { AdminBookingResponseDto } from './dto/admin-booking-response.dto';
import type { BookingEntity } from './entities/booking.entity';
import type { AdminBookingFilters } from './interfaces/admin-booking-filters.interface';
import type { AdminBookingList } from './interfaces/admin-booking-list.interface';
import type { AdminBookingTransaction } from './interfaces/admin-booking-transaction.interface';

@Injectable()
export class AdminBookingsService {
  constructor(
    private readonly adminBookingPersistenceService: AdminBookingPersistenceService,
    private readonly bookingEventsService: BookingEventsService,
  ) {}

  async approve(
    actorUserId: string,
    bookingId: string,
    input: AdminBookingActionDto,
  ): Promise<AdminBookingResponseDto> {
    return this.transition(
      actorUserId,
      bookingId,
      input,
      BookingStatus.APPROVED,
    );
  }

  async findById(bookingId: string): Promise<AdminBookingResponseDto> {
    const booking =
      await this.adminBookingPersistenceService.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('errors.bookingNotFound');
    }

    return this.toResponse(booking);
  }

  async findMany(query: AdminBookingQueryDto): Promise<AdminBookingList> {
    const filters = this.createFilters(query);
    const [bookings, totalItems] =
      await this.adminBookingPersistenceService.findMany(
        filters,
        query.offset,
        query.limit,
      );

    return {
      bookings: bookings.map((booking) => this.toResponse(booking)),
      meta: createPaginationMeta(query.page, query.limit, totalItems),
    };
  }

  async reject(
    actorUserId: string,
    bookingId: string,
    input: AdminBookingActionDto,
  ): Promise<AdminBookingResponseDto> {
    return this.transition(
      actorUserId,
      bookingId,
      input,
      BookingStatus.REJECTED,
    );
  }

  private createFilters(query: AdminBookingQueryDto): AdminBookingFilters {
    this.ensureCreatedDateRangeIsValid(query);

    return {
      createdFrom: query.createdFrom
        ? this.toUtcCalendarDay(query.createdFrom)
        : undefined,
      createdTo: query.createdTo
        ? this.toNextUtcCalendarDay(query.createdTo)
        : undefined,
      departureId: query.departureId,
      status: query.status,
      tourId: query.tourId,
      userId: query.userId,
    };
  }

  private ensureCreatedDateRangeIsValid(query: AdminBookingQueryDto): void {
    if (
      query.createdFrom &&
      query.createdTo &&
      this.toUtcCalendarDay(query.createdFrom).getTime() >
        this.toUtcCalendarDay(query.createdTo).getTime()
    ) {
      throw new BadRequestException('errors.bookingCreatedDateRangeInvalid');
    }
  }

  private normalizeReason(value: string | undefined): string | null {
    return value?.trim() || null;
  }

  private toNextUtcCalendarDay(value: string): Date {
    const date = this.toUtcCalendarDay(value);

    date.setUTCDate(date.getUTCDate() + ADMIN_BOOKING_NEXT_CALENDAR_DAY_OFFSET);

    return date;
  }

  private toResponse(booking: BookingEntity): AdminBookingResponseDto {
    return {
      bookingCode: booking.bookingCode,
      cancelReason: booking.cancelReason,
      createdAt: booking.createdAt,
      currency: booking.currency,
      departure: {
        bookedSeats: booking.departure.bookedSeats,
        capacity: booking.departure.capacity,
        endAt: booking.departure.endAt,
        id: booking.departure.id,
        startAt: booking.departure.startAt,
        status: booking.departure.status,
        tour: {
          code: booking.departure.tour.code,
          id: booking.departure.tour.id,
          title: booking.departure.tour.title,
        },
        tourId: booking.departure.tourId,
      },
      departureId: booking.departureId,
      id: booking.id,
      quantity: booking.quantity,
      status: booking.status,
      totalAmount: String(booking.totalAmount),
      unitPrice: String(booking.unitPrice),
      updatedAt: booking.updatedAt,
      user: {
        email: booking.user.email,
        id: booking.user.id,
      },
    };
  }

  private toUtcCalendarDay(value: string): Date {
    return new Date(`${value}${ADMIN_BOOKING_UTC_DAY_START_SUFFIX}`);
  }

  private async transition(
    actorUserId: string,
    bookingId: string,
    input: AdminBookingActionDto,
    nextStatus: BookingStatus.APPROVED | BookingStatus.REJECTED,
  ): Promise<AdminBookingResponseDto> {
    const event = await this.adminBookingPersistenceService.withinTransaction(
      async (transaction) => {
        const booking = await transaction.findBookingForUpdate(bookingId);

        if (!booking) {
          throw new NotFoundException('errors.bookingNotFound');
        }
        if (booking.status !== BookingStatus.PENDING) {
          throw new ConflictException('errors.bookingNotTransitionable');
        }

        const reason = this.normalizeReason(input.reason);

        if (nextStatus === BookingStatus.REJECTED) {
          await this.releaseDepartureSeats(transaction, booking);
          booking.cancelReason = reason;
        }

        booking.status = nextStatus;
        await transaction.saveBooking(booking);
        const event = {
          actorUserId,
          bookingId: booking.id,
          fromStatus: BookingStatus.PENDING,
          reason,
          toStatus: nextStatus,
        };
        await transaction.saveStatusHistory(event);
        await transaction.saveNotificationOutbox(event, booking.userId);

        return event;
      },
    );

    this.bookingEventsService.publishStatusChanged(event);

    return this.findById(event.bookingId);
  }

  private async releaseDepartureSeats(
    transaction: AdminBookingTransaction,
    booking: BookingEntity,
  ): Promise<void> {
    const departure = await transaction.findDepartureForUpdate(
      booking.departureId,
    );

    if (!departure) {
      throw new NotFoundException('errors.departureNotFound');
    }
    if (departure.bookedSeats < booking.quantity) {
      throw new ConflictException('errors.bookingDepartureSeatInconsistent');
    }

    departure.bookedSeats -= booking.quantity;
    await transaction.saveDeparture(departure);
  }
}
