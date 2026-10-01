import type { BookingReminderNotificationJob } from './booking-reminder-notification-job.interface';
import type { BookingStatusNotificationJob } from './booking-status-notification-job.interface';

export interface NotificationQueueJobDetails {
  data: BookingReminderNotificationJob | BookingStatusNotificationJob;
  jobId: string;
  name: string;
}
