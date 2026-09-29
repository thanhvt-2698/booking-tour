import { InjectQueue } from '@nestjs/bull';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type { Queue } from 'bull';
import { BookingEventsService } from '../bookings/booking-events.service';
import { BookingStatus } from '../bookings/constants/booking.constants';
import type { BookingStatusChangedEvent } from '../bookings/interfaces/booking-status-changed.interface';
import {
  BOOKING_NOTIFICATION_BACKOFF_DELAY_MS,
  BOOKING_NOTIFICATION_JOB_ID_PREFIX,
  BOOKING_NOTIFICATION_MAX_ATTEMPTS,
  BOOKING_NOTIFICATION_QUEUE,
  BOOKING_STATUS_NOTIFICATION_JOB,
} from './constants/notification.constants';
import type { BookingNotificationJob } from './interfaces/booking-notification-job.interface';
import { NotificationBookingsStore } from './notification-bookings.store';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectQueue(BOOKING_NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<BookingNotificationJob>,
    private readonly bookingEventsService: BookingEventsService,
    private readonly notificationBookingsStore: NotificationBookingsStore,
  ) {}

  onModuleInit(): void {
    this.bookingEventsService.onStatusChanged((event) => {
      void this.handleStatusChanged(event).catch((error: unknown) => {
        this.logEnqueueFailure(event.bookingId, error);
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

    const booking = await this.notificationBookingsStore.findRecipient(
      event.bookingId,
    );

    if (!booking) {
      throw new NotFoundException('errors.bookingNotFound');
    }

    await this.notificationQueue.add(
      BOOKING_STATUS_NOTIFICATION_JOB,
      {
        bookingId: booking.bookingId,
        reason: event.reason,
        recipientUserId: booking.recipientUserId,
        status: event.toStatus,
      },
      {
        attempts: BOOKING_NOTIFICATION_MAX_ATTEMPTS,
        backoff: {
          delay: BOOKING_NOTIFICATION_BACKOFF_DELAY_MS,
          type: 'exponential',
        },
        jobId: this.createJobId(booking.bookingId, event.toStatus),
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }

  private createJobId(
    bookingId: string,
    status: BookingNotificationJob['status'],
  ): string {
    return `${BOOKING_NOTIFICATION_JOB_ID_PREFIX}-${bookingId}-${status.toLowerCase()}`;
  }

  private logEnqueueFailure(bookingId: string, error: unknown): void {
    Logger.error(
      {
        bookingId,
        error:
          error instanceof Error
            ? { message: error.message, name: error.name }
            : { name: 'UnknownError' },
        event: 'booking_notification_enqueue_failed',
      },
      undefined,
      NotificationsService.name,
    );
  }
}
