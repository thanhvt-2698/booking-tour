import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bull';
import { createBookingStatusEmail } from './booking-status-email.template';
import {
  BOOKING_NOTIFICATION_QUEUE,
  BOOKING_STATUS_NOTIFICATION_JOB,
  MAIL_FROM_CONFIG_KEY,
  NOTIFICATION_MAIL_SENDER,
} from './constants/notification.constants';
import type { BookingNotificationJob } from './interfaces/booking-notification-job.interface';
import type { MailSender } from './interfaces/mail-sender.interface';
import { NotificationBookingsStore } from './notification-bookings.store';

@Processor(BOOKING_NOTIFICATION_QUEUE)
export class BookingNotificationProcessor {
  constructor(
    private readonly configService: ConfigService,
    @Inject(NOTIFICATION_MAIL_SENDER)
    private readonly mailSender: MailSender,
    private readonly notificationBookingsStore: NotificationBookingsStore,
  ) {}

  @Process(BOOKING_STATUS_NOTIFICATION_JOB)
  async process(job: Job<BookingNotificationJob>): Promise<void> {
    const booking = await this.notificationBookingsStore.findDelivery(job.data);

    if (!booking) {
      throw new NotFoundException('errors.bookingNotFound');
    }

    await this.mailSender.send(
      createBookingStatusEmail(
        {
          bookingCode: booking.bookingCode,
          reason: job.data.reason,
          recipientEmail: booking.recipientEmail,
          status: job.data.status,
        },
        this.configService.getOrThrow<string>(MAIL_FROM_CONFIG_KEY),
      ),
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<BookingNotificationJob>, error: Error): void {
    Logger.error(
      {
        attemptsMade: job.attemptsMade,
        bookingId: job.data.bookingId,
        error: { message: error.message, name: error.name },
        event: 'booking_notification_failed',
        jobId: job.id,
      },
      undefined,
      BookingNotificationProcessor.name,
    );
  }
}
