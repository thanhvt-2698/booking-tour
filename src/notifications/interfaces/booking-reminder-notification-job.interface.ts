export interface BookingReminderNotificationJob {
  bookingId: string;
  outboxId: string;
  recipientUserId: string;
  startAt: string;
}
