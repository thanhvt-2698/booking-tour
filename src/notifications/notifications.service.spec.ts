import type { Queue } from 'bull';
import { BookingEventsService } from '../bookings/booking-events.service';
import { BookingStatus } from '../bookings/constants/booking.constants';
import {
  BOOKING_NOTIFICATION_BACKOFF_DELAY_MS,
  BOOKING_NOTIFICATION_JOB_ID_PREFIX,
  BOOKING_NOTIFICATION_MAX_ATTEMPTS,
  BOOKING_STATUS_NOTIFICATION_JOB,
} from './constants/notification.constants';
import type { BookingNotificationJob } from './interfaces/booking-notification-job.interface';
import { NotificationBookingsStore } from './notification-bookings.store';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const userId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  let addMock: jest.Mock;
  let findRecipientMock: jest.Mock;
  let onStatusChangedMock: jest.Mock;
  let notificationsService: NotificationsService;

  beforeEach(() => {
    addMock = jest.fn();
    findRecipientMock = jest.fn();
    onStatusChangedMock = jest.fn();
    notificationsService = new NotificationsService(
      {
        add: addMock,
      } as unknown as Queue<BookingNotificationJob>,
      {
        onStatusChanged: onStatusChangedMock,
      } as unknown as BookingEventsService,
      {
        findRecipient: findRecipientMock,
      } as unknown as NotificationBookingsStore,
    );
  });

  it('subscribes to status events and queues an approved booking email', async () => {
    findRecipientMock.mockResolvedValue({
      bookingId,
      recipientUserId: userId,
    });

    notificationsService.onModuleInit();
    await notificationsService.handleStatusChanged({
      actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      bookingId,
      fromStatus: BookingStatus.PENDING,
      reason: null,
      toStatus: BookingStatus.APPROVED,
    });

    expect(onStatusChangedMock).toHaveBeenCalledTimes(1);
    expect(findRecipientMock).toHaveBeenCalledWith(bookingId);
    expect(addMock).toHaveBeenCalledWith(
      BOOKING_STATUS_NOTIFICATION_JOB,
      {
        bookingId,
        reason: null,
        recipientUserId: userId,
        status: BookingStatus.APPROVED,
      },
      {
        attempts: BOOKING_NOTIFICATION_MAX_ATTEMPTS,
        backoff: {
          delay: BOOKING_NOTIFICATION_BACKOFF_DELAY_MS,
          type: 'exponential',
        },
        jobId: `${BOOKING_NOTIFICATION_JOB_ID_PREFIX}-${bookingId}-approved`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  });

  it('ignores booking statuses that do not send an email', async () => {
    await notificationsService.handleStatusChanged({
      actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      bookingId,
      fromStatus: BookingStatus.PENDING,
      reason: null,
      toStatus: BookingStatus.CANCELLED,
    });

    expect(findRecipientMock).not.toHaveBeenCalled();
    expect(addMock).not.toHaveBeenCalled();
  });
});
