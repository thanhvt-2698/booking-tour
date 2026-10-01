import type { BookingStatus } from '../../bookings/constants/booking.constants';

export interface LegacyBookingStatusNotificationJob {
  bookingId: string;
  outboxId?: string;
  reason: string | null;
  recipientUserId: string;
  status: BookingStatus.APPROVED | BookingStatus.REJECTED;
}
