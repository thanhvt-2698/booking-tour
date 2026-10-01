import type { BookingReminderNotificationJob } from './booking-reminder-notification-job.interface';
import type { BookingStatusNotificationJob } from './booking-status-notification-job.interface';
import type { LegacyBookingStatusNotificationJob } from './legacy-booking-status-notification-job.interface';

export type BookingNotificationJob =
  | BookingReminderNotificationJob
  | BookingStatusNotificationJob
  | LegacyBookingStatusNotificationJob;
