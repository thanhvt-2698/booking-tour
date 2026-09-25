import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import {
  ADMIN_BOOKING_ACTION_QUERY_FIELDS,
  ADMIN_BOOKING_DEPARTURE_ACTION_QUERY_FIELDS,
  ADMIN_BOOKING_DEPARTURE_QUERY_FIELDS,
  ADMIN_BOOKING_QUERY_FIELDS,
  ADMIN_BOOKING_TOUR_QUERY_FIELDS,
  ADMIN_BOOKING_USER_QUERY_FIELDS,
} from './constants/admin-booking.constants';
import { BookingStatusHistoryEntity } from './entities/booking-status-history.entity';
import { BookingEntity } from './entities/booking.entity';
import type { AdminBookingFilters } from './interfaces/admin-booking-filters.interface';
import type { CreateBookingStatusHistory } from './interfaces/create-booking-status-history.interface';

export class AdminBookingsTransaction {
  constructor(private readonly manager: EntityManager) {}

  async findBookingForUpdate(bookingId: string): Promise<BookingEntity | null> {
    return this.manager
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .setLock('pessimistic_write')
      .select(ADMIN_BOOKING_ACTION_QUERY_FIELDS)
      .where('booking.id = :bookingId', { bookingId })
      .getOne();
  }

  async findDepartureForUpdate(
    departureId: string,
  ): Promise<TourDepartureEntity | null> {
    return this.manager
      .getRepository(TourDepartureEntity)
      .createQueryBuilder('departure')
      .setLock('pessimistic_write')
      .select(ADMIN_BOOKING_DEPARTURE_ACTION_QUERY_FIELDS)
      .where('departure.id = :departureId', { departureId })
      .getOne();
  }

  async saveBooking(booking: BookingEntity): Promise<BookingEntity> {
    return this.manager.getRepository(BookingEntity).save(booking);
  }

  async saveDeparture(
    departure: TourDepartureEntity,
  ): Promise<TourDepartureEntity> {
    return this.manager.getRepository(TourDepartureEntity).save(departure);
  }

  async saveStatusHistory(
    input: CreateBookingStatusHistory,
  ): Promise<BookingStatusHistoryEntity> {
    const repository = this.manager.getRepository(BookingStatusHistoryEntity);

    return repository.save(repository.create(input));
  }
}

@Injectable()
export class AdminBookingsStore {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookingEntity)
    private readonly bookingsRepository: Repository<BookingEntity>,
  ) {}

  async findById(bookingId: string): Promise<BookingEntity | null> {
    return this.createBookingDetailsQuery()
      .where('booking.id = :bookingId', { bookingId })
      .getOne();
  }

  async findMany(
    filters: AdminBookingFilters,
    offset: number,
    limit: number,
  ): Promise<[BookingEntity[], number]> {
    const query = this.createBookingDetailsQuery()
      .orderBy('booking.createdAt', 'DESC')
      .addOrderBy('booking.id', 'DESC')
      .skip(offset)
      .take(limit);

    this.addCreatedFromFilter(query, filters.createdFrom);
    this.addCreatedToFilter(query, filters.createdTo);
    this.addDepartureFilter(query, filters.departureId);
    this.addStatusFilter(query, filters.status);
    this.addTourFilter(query, filters.tourId);
    this.addUserFilter(query, filters.userId);

    return query.getManyAndCount();
  }

  async withinTransaction<T>(
    operation: (transaction: AdminBookingsTransaction) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(new AdminBookingsTransaction(manager)),
    );
  }

  private addCreatedFromFilter(
    query: SelectQueryBuilder<BookingEntity>,
    createdFrom: Date | undefined,
  ): void {
    if (createdFrom) {
      query.andWhere('booking.created_at >= :createdFrom', { createdFrom });
    }
  }

  private addCreatedToFilter(
    query: SelectQueryBuilder<BookingEntity>,
    createdTo: Date | undefined,
  ): void {
    if (createdTo) {
      query.andWhere('booking.created_at < :createdTo', { createdTo });
    }
  }

  private addDepartureFilter(
    query: SelectQueryBuilder<BookingEntity>,
    departureId: string | undefined,
  ): void {
    if (departureId) {
      query.andWhere('booking.departure_id = :departureId', { departureId });
    }
  }

  private addStatusFilter(
    query: SelectQueryBuilder<BookingEntity>,
    status: AdminBookingFilters['status'],
  ): void {
    if (status) {
      query.andWhere('booking.status = :status', { status });
    }
  }

  private addTourFilter(
    query: SelectQueryBuilder<BookingEntity>,
    tourId: string | undefined,
  ): void {
    if (tourId) {
      query.andWhere('departure.tour_id = :tourId', { tourId });
    }
  }

  private addUserFilter(
    query: SelectQueryBuilder<BookingEntity>,
    userId: string | undefined,
  ): void {
    if (userId) {
      query.andWhere('booking.user_id = :userId', { userId });
    }
  }

  private createBookingDetailsQuery(): SelectQueryBuilder<BookingEntity> {
    return this.bookingsRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.user', 'user')
      .innerJoinAndSelect('booking.departure', 'departure')
      .innerJoinAndSelect('departure.tour', 'tour')
      .select([
        ...ADMIN_BOOKING_QUERY_FIELDS,
        ...ADMIN_BOOKING_USER_QUERY_FIELDS,
        ...ADMIN_BOOKING_DEPARTURE_QUERY_FIELDS,
        ...ADMIN_BOOKING_TOUR_QUERY_FIELDS,
      ]);
  }
}
