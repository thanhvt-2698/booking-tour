import { BookingStatus } from '../bookings/constants/booking.constants';
import {
  BOOKING_NOTIFICATION_OUTBOX_DEDUPE_KEY_SEPARATOR,
  BookingNotificationOutboxKind,
} from './constants/notification.constants';

export function createStatusNotificationOutboxDeduplicationKey(
  bookingId: string,
  status: BookingStatus.APPROVED | BookingStatus.REJECTED,
): string {
  return [
    BookingNotificationOutboxKind.STATUS,
    bookingId,
    status.toLowerCase(),
  ].join(BOOKING_NOTIFICATION_OUTBOX_DEDUPE_KEY_SEPARATOR);
}

export function createReminderNotificationOutboxDeduplicationKey(
  bookingId: string,
  startAt: Date,
): string {
  return [
    BookingNotificationOutboxKind.REMINDER,
    bookingId,
    startAt.toISOString(),
  ].join(BOOKING_NOTIFICATION_OUTBOX_DEDUPE_KEY_SEPARATOR);
}
