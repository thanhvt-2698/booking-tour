import type { BookingStatus } from '../../bookings/constants/booking.constants';
import type { BookingNotificationOutboxKind } from '../constants/notification.constants';

export interface CreateNotificationOutbox {
  bookingId: string;
  deduplicationKey: string;
  kind: BookingNotificationOutboxKind;
  recipientUserId: string;
  reason: string | null;
  startAt: Date | null;
  status: BookingStatus | null;
}
