import type { TourDepartureEntity } from '../../tours/entities/tour-departure.entity';
import type { BookingStatusHistoryEntity } from '../entities/booking-status-history.entity';
import type { BookingEntity } from '../entities/booking.entity';
import type { CreateBookingStatusHistory } from './create-booking-status-history.interface';

export interface AdminBookingTransaction {
  findBookingForUpdate(bookingId: string): Promise<BookingEntity | null>;
  findDepartureForUpdate(
    departureId: string,
  ): Promise<TourDepartureEntity | null>;
  saveBooking(booking: BookingEntity): Promise<BookingEntity>;
  saveDeparture(departure: TourDepartureEntity): Promise<TourDepartureEntity>;
  saveStatusHistory(
    input: CreateBookingStatusHistory,
  ): Promise<BookingStatusHistoryEntity>;
}
