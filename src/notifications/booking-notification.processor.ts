import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bull';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { createBookingReminderEmail } from './booking-reminder-email.template';
import { createBookingStatusEmail } from './booking-status-email.template';
import {
  BOOKING_NOTIFICATION_QUEUE,
  BOOKING_NOTIFICATION_JOB_FIELDS,
  BOOKING_NOTIFICATION_FAILED_EVENT,
  BOOKING_REMINDER_NOTIFICATION_JOB,
  BOOKING_STATUS_NOTIFICATION_JOB,
  MAIL_ENABLED_CONFIG_KEY,
  MAIL_FROM_CONFIG_KEY,
  NOTIFICATION_MAIL_SENDER,
  BookingNotificationDeliveryStatus,
  BookingNotificationOutboxKind,
} from './constants/notification.constants';
import type { BookingNotificationJob } from './interfaces/booking-notification-job.interface';
import type { BookingReminderNotificationJob } from './interfaces/booking-reminder-notification-job.interface';
import type { BookingStatusNotificationJob } from './interfaces/booking-status-notification-job.interface';
import type { LegacyBookingStatusNotificationJob } from './interfaces/legacy-booking-status-notification-job.interface';
import type { MailSender } from './interfaces/mail-sender.interface';
import { NotificationBookingsService } from './notification-bookings.service';

@Processor(BOOKING_NOTIFICATION_QUEUE)
export class BookingNotificationProcessor {
  constructor(
    private readonly configService: ConfigService,
    @Inject(NOTIFICATION_MAIL_SENDER)
    private readonly mailSender: MailSender,
    private readonly notificationBookingsService: NotificationBookingsService,
  ) {}

  @Process(BOOKING_STATUS_NOTIFICATION_JOB)
  async processStatus(
    job: Job<BookingStatusNotificationJob | LegacyBookingStatusNotificationJob>,
  ): Promise<void> {
    if (this.isDurableStatusJob(job.data)) {
      await this.processNotification(
        job.data,
        BookingNotificationOutboxKind.STATUS,
      );

      return;
    }

    const outbox =
      await this.notificationBookingsService.ensureLegacyStatusOutbox(job.data);

    if (!outbox) {
      throw new NotFoundException('errors.bookingNotFound');
    }

    await this.processNotification(
      { ...job.data, outboxId: outbox.id },
      BookingNotificationOutboxKind.STATUS,
    );
  }

  private isDurableStatusJob(
    jobData: BookingStatusNotificationJob | LegacyBookingStatusNotificationJob,
  ): jobData is BookingStatusNotificationJob {
    return Boolean(jobData.outboxId);
  }

  @Process(BOOKING_REMINDER_NOTIFICATION_JOB)
  async processReminder(
    job: Job<BookingReminderNotificationJob>,
  ): Promise<void> {
    await this.processNotification(
      job.data,
      BookingNotificationOutboxKind.REMINDER,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<BookingNotificationJob>, error: Error): void {
    Logger.error(
      {
        attemptsMade: job.attemptsMade,
        bookingId: job.data.bookingId,
        errorName: error.name,
        event: BOOKING_NOTIFICATION_FAILED_EVENT,
        jobId: job.id,
        notificationOutboxId: job.data.outboxId,
      },
      undefined,
      BookingNotificationProcessor.name,
    );
  }

  private async processNotification(
    job: BookingStatusNotificationJob | BookingReminderNotificationJob,
    expectedKind: BookingNotificationOutboxKind,
  ): Promise<void> {
    const outbox = await this.notificationBookingsService.findOutboxById(
      job.outboxId,
    );

    if (!outbox || outbox.processedAt) {
      return;
    }

    if (outbox.kind !== expectedKind) {
      throw new NotFoundException('errors.bookingNotFound');
    }

    let deliveryStatus: BookingNotificationDeliveryStatus;

    if (expectedKind === BookingNotificationOutboxKind.STATUS) {
      if (
        !(BOOKING_NOTIFICATION_JOB_FIELDS.status in job) ||
        (job.status !== BookingStatus.APPROVED &&
          job.status !== BookingStatus.REJECTED)
      ) {
        throw new NotFoundException('errors.bookingNotFound');
      }

      const booking = await this.notificationBookingsService.findDelivery(job);

      if (!booking) {
        throw new NotFoundException('errors.bookingNotFound');
      }

      const mailEnabled = this.configService.getOrThrow<boolean>(
        MAIL_ENABLED_CONFIG_KEY,
      );
      const from = this.configService.getOrThrow<string>(MAIL_FROM_CONFIG_KEY);

      await this.mailSender.send(
        createBookingStatusEmail(
          {
            bookingCode: booking.bookingCode,
            reason: job.reason,
            recipientEmail: booking.recipientEmail,
            status: job.status,
          },
          from,
        ),
      );
      deliveryStatus = mailEnabled
        ? BookingNotificationDeliveryStatus.SENT
        : BookingNotificationDeliveryStatus.SKIPPED;
    } else {
      if (
        !(BOOKING_NOTIFICATION_JOB_FIELDS.startAt in job) ||
        !outbox.startAt
      ) {
        throw new NotFoundException('errors.bookingNotFound');
      }

      const jobStartAt = new Date(job.startAt);

      if (jobStartAt.getTime() !== outbox.startAt.getTime()) {
        throw new NotFoundException('errors.bookingNotFound');
      }

      const booking =
        await this.notificationBookingsService.findReminderDelivery(
          job,
          outbox.startAt,
          new Date(),
        );

      if (!booking) {
        await this.notificationBookingsService.markOutboxProcessed(
          job.outboxId,
          new Date(),
          BookingNotificationDeliveryStatus.SKIPPED,
        );
        return;
      }

      const mailEnabled = this.configService.getOrThrow<boolean>(
        MAIL_ENABLED_CONFIG_KEY,
      );
      const from = this.configService.getOrThrow<string>(MAIL_FROM_CONFIG_KEY);

      await this.mailSender.send(
        createBookingReminderEmail(
          {
            bookingCode: booking.bookingCode,
            recipientEmail: booking.recipientEmail,
            startAt: job.startAt,
          },
          from,
        ),
      );
      deliveryStatus = mailEnabled
        ? BookingNotificationDeliveryStatus.SENT
        : BookingNotificationDeliveryStatus.SKIPPED;
    }

    // SMTP acceptance and this database write cannot share a transaction, so retries can resend.
    await this.notificationBookingsService.markOutboxProcessed(
      job.outboxId,
      new Date(),
      deliveryStatus,
    );
  }
}
