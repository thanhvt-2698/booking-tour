import type { EntityManager } from 'typeorm';
import { createStatusNotificationOutbox } from '../notifications/booking-notification-outbox.writer';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import {
  ADMIN_BOOKING_ACTION_QUERY_FIELDS,
  ADMIN_BOOKING_DEPARTURE_ACTION_QUERY_FIELDS,
} from './constants/admin-booking.constants';
import { BookingStatusHistoryEntity } from './entities/booking-status-history.entity';
import { BookingEntity } from './entities/booking.entity';
import type { AdminBookingTransaction } from './interfaces/admin-booking-transaction.interface';
import type { BookingStatusChangedEvent } from './interfaces/booking-status-changed.interface';
import type { CreateBookingStatusHistory } from './interfaces/create-booking-status-history.interface';

export class AdminBookingTransactionService implements AdminBookingTransaction {
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

  async saveNotificationOutbox(
    event: BookingStatusChangedEvent,
    recipientUserId: string,
  ): Promise<void> {
    await createStatusNotificationOutbox(this.manager, event, recipientUserId);
  }
}
