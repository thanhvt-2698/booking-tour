import type { BookingStatus } from '../constants/booking.constants';

export interface BookingStatusChangedEvent {
  actorUserId: string;
  bookingId: string;
  fromStatus: BookingStatus;
  reason: string | null;
  toStatus: BookingStatus;
}
