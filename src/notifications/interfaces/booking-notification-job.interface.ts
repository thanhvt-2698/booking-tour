import type { BookingStatus } from '../../bookings/constants/booking.constants';

export interface BookingNotificationJob {
  bookingId: string;
  reason: string | null;
  recipientUserId: string;
  status: BookingStatus.APPROVED | BookingStatus.REJECTED;
}
