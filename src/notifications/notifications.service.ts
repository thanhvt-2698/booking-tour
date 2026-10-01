import { InjectQueue } from '@nestjs/bull';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { JobOptions, Queue } from 'bull';
import { BookingEventsService } from '../bookings/booking-events.service';
import { BookingStatus } from '../bookings/constants/booking.constants';
import type { BookingStatusChangedEvent } from '../bookings/interfaces/booking-status-changed.interface';
import {
  BOOKING_NOTIFICATION_BACKOFF_DELAY_MS,
  BOOKING_NOTIFICATION_JOB_ID_PREFIX,
  BOOKING_NOTIFICATION_MAX_ATTEMPTS,
  BOOKING_NOTIFICATION_OUTBOX_BATCH_SIZE,
  BOOKING_NOTIFICATION_QUEUE,
  BOOKING_NOTIFICATION_BLOCKING_JOB_STATES,
  BOOKING_NOTIFICATION_DISPATCH_FAILED_EVENT,
  BOOKING_REMINDER_NOTIFICATION_JOB,
  BOOKING_REMINDER_NOTIFICATION_JOB_ID_PREFIX,
  BOOKING_STATUS_NOTIFICATION_JOB,
  BookingNotificationOutboxKind,
} from './constants/notification.constants';
import type { BookingNotificationJob } from './interfaces/booking-notification-job.interface';
import type { BookingReminderNotificationJob } from './interfaces/booking-reminder-notification-job.interface';
import type { BookingStatusNotificationJob } from './interfaces/booking-status-notification-job.interface';
import type { NotificationQueueJobDetails } from './interfaces/notification-queue-job-details.interface';
import type { LegacyBookingStatusNotificationJob } from './interfaces/legacy-booking-status-notification-job.interface';
import { NotificationBookingsService } from './notification-bookings.service';
import type { BookingNotificationOutboxEntity } from './entities/booking-notification-outbox.entity';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectQueue(BOOKING_NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<BookingNotificationJob>,
    private readonly bookingEventsService: BookingEventsService,
    private readonly notificationBookingsService: NotificationBookingsService,
  ) {}

  onModuleInit(): void {
    this.bookingEventsService.onStatusChanged((event) => {
      void this.handleStatusChanged(event).catch((error: unknown) => {
        this.logDispatchFailure(event.bookingId, undefined, error);
      });
    });
  }

  async handleStatusChanged(event: BookingStatusChangedEvent): Promise<void> {
    if (
      event.toStatus !== BookingStatus.APPROVED &&
      event.toStatus !== BookingStatus.REJECTED
    ) {
      return;
    }

    await this.dispatchPending();
  }

  async scheduleReminder(
    bookingId: string,
    startAt: Date,
    now: Date = new Date(),
  ): Promise<void> {
    const recipient =
      await this.notificationBookingsService.findReminderRecipient(
        bookingId,
        startAt,
        now,
      );

    if (!recipient) {
      return;
    }

    await this.notificationBookingsService.createReminderOutbox(
      recipient,
      startAt,
    );
  }

  async dispatchPending(now: Date = new Date()): Promise<number> {
    const pending = await this.notificationBookingsService.findPendingOutbox(
      BOOKING_NOTIFICATION_OUTBOX_BATCH_SIZE,
    );
    let dispatchedCount = 0;

    for (const outbox of pending) {
      try {
        const dispatched = await this.dispatchOutbox(outbox, now);

        if (dispatched) {
          dispatchedCount += 1;
        }
      } catch (error: unknown) {
        this.logDispatchFailure(outbox.bookingId, outbox.id, error);
      } finally {
        await this.notificationBookingsService.markOutboxChecked(
          outbox.id,
          now,
        );
      }
    }

    return dispatchedCount;
  }

  async retryFailedNotifications(now: Date = new Date()): Promise<number> {
    const failedJobs = await this.notificationQueue.getFailed(
      0,
      BOOKING_NOTIFICATION_OUTBOX_BATCH_SIZE - 1,
    );
    let retriedCount = 0;

    for (const job of failedJobs) {
      const outbox = await this.findJobOutbox(job.data);

      if (!outbox || outbox.processedAt) {
        await job.remove();
        continue;
      }

      try {
        await job.retry();
        await this.notificationBookingsService.markOutboxDispatched(
          outbox.id,
          now,
        );
        retriedCount += 1;
      } catch (error: unknown) {
        this.logDispatchFailure(outbox.bookingId, outbox.id, error);
      } finally {
        await this.notificationBookingsService.markOutboxChecked(
          outbox.id,
          now,
        );
      }
    }

    return retriedCount;
  }

  private async dispatchOutbox(
    outbox: BookingNotificationOutboxEntity,
    now: Date,
  ): Promise<boolean> {
    const jobDetails = this.createJobDetails(outbox);
    const existingJob = await this.notificationQueue.getJob(jobDetails.jobId);

    if (existingJob) {
      const jobState = await existingJob.getState();

      if (BOOKING_NOTIFICATION_BLOCKING_JOB_STATES.has(jobState)) {
        return false;
      }

      if (jobState === 'completed') {
        const currentOutbox =
          await this.notificationBookingsService.findOutboxById(outbox.id);

        if (!currentOutbox || currentOutbox.processedAt) {
          return false;
        }

        await existingJob.remove();
      }
    }

    await this.notificationQueue.add(
      jobDetails.name,
      jobDetails.data,
      this.createJobOptions(jobDetails.jobId),
    );
    await this.notificationBookingsService.markOutboxDispatched(outbox.id, now);

    return true;
  }

  private createJobDetails(
    outbox: BookingNotificationOutboxEntity,
  ): NotificationQueueJobDetails {
    if (outbox.kind === BookingNotificationOutboxKind.STATUS) {
      if (
        outbox.status !== BookingStatus.APPROVED &&
        outbox.status !== BookingStatus.REJECTED
      ) {
        throw new InternalServerErrorException('errors.internal');
      }

      const data: BookingStatusNotificationJob = {
        bookingId: outbox.bookingId,
        outboxId: outbox.id,
        reason: outbox.reason,
        recipientUserId: outbox.recipientUserId,
        status: outbox.status,
      };

      return {
        data,
        jobId: this.createStatusJobId(outbox.bookingId, outbox.status),
        name: BOOKING_STATUS_NOTIFICATION_JOB,
      };
    }

    if (
      outbox.kind === BookingNotificationOutboxKind.REMINDER &&
      outbox.startAt
    ) {
      const data: BookingReminderNotificationJob = {
        bookingId: outbox.bookingId,
        outboxId: outbox.id,
        recipientUserId: outbox.recipientUserId,
        startAt: outbox.startAt.toISOString(),
      };

      return {
        data,
        jobId: this.createReminderJobId(outbox.bookingId, outbox.startAt),
        name: BOOKING_REMINDER_NOTIFICATION_JOB,
      };
    }

    throw new InternalServerErrorException('errors.internal');
  }

  private createJobOptions(jobId: string): JobOptions {
    return {
      attempts: BOOKING_NOTIFICATION_MAX_ATTEMPTS,
      backoff: {
        delay: BOOKING_NOTIFICATION_BACKOFF_DELAY_MS,
        type: 'exponential',
      },
      jobId,
      removeOnComplete: false,
      removeOnFail: false,
    };
  }

  private createStatusJobId(
    bookingId: string,
    status: BookingStatus.APPROVED | BookingStatus.REJECTED,
  ): string {
    return `${BOOKING_NOTIFICATION_JOB_ID_PREFIX}-${bookingId}-${status.toLowerCase()}`;
  }

  private createReminderJobId(bookingId: string, startAt: Date): string {
    return `${BOOKING_REMINDER_NOTIFICATION_JOB_ID_PREFIX}-${bookingId}-${startAt.getTime()}`;
  }

  private logDispatchFailure(
    bookingId: string,
    outboxId: string | undefined,
    error: unknown,
  ): void {
    Logger.error(
      {
        bookingId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        event: BOOKING_NOTIFICATION_DISPATCH_FAILED_EVENT,
        notificationOutboxId: outboxId,
      },
      undefined,
      NotificationsService.name,
    );
  }

  private async findJobOutbox(
    jobData: BookingNotificationJob,
  ): Promise<BookingNotificationOutboxEntity | null> {
    if (jobData.outboxId) {
      return this.notificationBookingsService.findOutboxById(jobData.outboxId);
    }

    if (this.isLegacyStatusJob(jobData)) {
      return this.notificationBookingsService.ensureLegacyStatusOutbox(jobData);
    }

    return null;
  }

  private isLegacyStatusJob(
    jobData: BookingNotificationJob,
  ): jobData is LegacyBookingStatusNotificationJob {
    return 'status' in jobData;
  }
}
