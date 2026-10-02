import type { BookingStatus } from '../../bookings/constants/booking.constants';

export interface BookingStatusNotificationJob {
  bookingId: string;
  outboxId: string;
  reason: string | null;
  recipientUserId: string;
  status: BookingStatus.APPROVED | BookingStatus.REJECTED;
}
