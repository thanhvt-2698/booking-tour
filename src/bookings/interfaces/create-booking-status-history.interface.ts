import type { BookingStatus } from '../constants/booking.constants';

export interface CreateBookingStatusHistory {
  actorUserId: string;
  bookingId: string;
  fromStatus: BookingStatus;
  reason: string | null;
  toStatus: BookingStatus;
}
