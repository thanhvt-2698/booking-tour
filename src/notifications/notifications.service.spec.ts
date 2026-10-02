import type { Queue, Job } from 'bull';
import { BookingEventsService } from '../bookings/booking-events.service';
import { BookingStatus } from '../bookings/constants/booking.constants';
import {
  BOOKING_NOTIFICATION_BACKOFF_DELAY_MS,
  BOOKING_NOTIFICATION_JOB_ID_PREFIX,
  BOOKING_NOTIFICATION_MAX_ATTEMPTS,
  BOOKING_NOTIFICATION_OUTBOX_BATCH_SIZE,
  BOOKING_REMINDER_NOTIFICATION_JOB,
  BOOKING_STATUS_NOTIFICATION_JOB,
  BookingNotificationOutboxKind,
} from './constants/notification.constants';
import type { BookingNotificationJob } from './interfaces/booking-notification-job.interface';
import type { NotificationBookingsService } from './notification-bookings.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const userId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const outboxId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const startAt = new Date('2027-03-10T09:30:00.000Z');
  let addMock: jest.Mock;
  let getFailedMock: jest.Mock;
  let getJobMock: jest.Mock;
  let findPendingOutboxMock: jest.Mock;
  let findOutboxByIdMock: jest.Mock;
  let findReminderRecipientMock: jest.Mock;
  let createReminderOutboxMock: jest.Mock;
  let markOutboxCheckedMock: jest.Mock;
  let markOutboxDispatchedMock: jest.Mock;
  let onStatusChangedMock: jest.Mock;
  let notificationsService: NotificationsService;

  beforeEach(() => {
    addMock = jest.fn().mockResolvedValue({});
    getFailedMock = jest.fn().mockResolvedValue([]);
    getJobMock = jest.fn().mockResolvedValue(null);
    findPendingOutboxMock = jest.fn().mockResolvedValue([]);
    findOutboxByIdMock = jest.fn();
    findReminderRecipientMock = jest.fn();
    createReminderOutboxMock = jest.fn();
    markOutboxCheckedMock = jest.fn();
    markOutboxDispatchedMock = jest.fn();
    onStatusChangedMock = jest.fn();
    notificationsService = new NotificationsService(
      {
        add: addMock,
        getFailed: getFailedMock,
        getJob: getJobMock,
      } as unknown as Queue<BookingNotificationJob>,
      {
        onStatusChanged: onStatusChangedMock,
      } as unknown as BookingEventsService,
      {
        createReminderOutbox: createReminderOutboxMock,
        findOutboxById: findOutboxByIdMock,
        findPendingOutbox: findPendingOutboxMock,
        findReminderRecipient: findReminderRecipientMock,
        markOutboxChecked: markOutboxCheckedMock,
        markOutboxDispatched: markOutboxDispatchedMock,
      } as unknown as NotificationBookingsService,
    );
  });

  it('wakes the durable dispatcher after a status event and sends the stored snapshot', async () => {
    const outbox = {
      bookingId,
      id: outboxId,
      kind: BookingNotificationOutboxKind.STATUS,
      reason: null,
      recipientUserId: userId,
      startAt: null,
      status: BookingStatus.APPROVED,
    };
    findPendingOutboxMock.mockResolvedValue([outbox]);

    notificationsService.onModuleInit();
    await notificationsService.handleStatusChanged({
      actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      bookingId,
      fromStatus: BookingStatus.PENDING,
      reason: null,
      toStatus: BookingStatus.APPROVED,
    });

    expect(onStatusChangedMock).toHaveBeenCalledTimes(1);
    expect(findPendingOutboxMock).toHaveBeenCalledWith(
      BOOKING_NOTIFICATION_OUTBOX_BATCH_SIZE,
    );
    expect(addMock).toHaveBeenCalledWith(
      BOOKING_STATUS_NOTIFICATION_JOB,
      {
        bookingId,
        outboxId,
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
    expect(markOutboxDispatchedMock).toHaveBeenCalledWith(
      outboxId,
      expect.any(Date),
    );
    expect(markOutboxCheckedMock).toHaveBeenCalledWith(
      outboxId,
      expect.any(Date),
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

    expect(findPendingOutboxMock).not.toHaveBeenCalled();
    expect(addMock).not.toHaveBeenCalled();
  });

  it('creates a stable reminder outbox row only for the approved booking', async () => {
    const now = new Date('2026-10-01T00:00:00Z');
    findReminderRecipientMock.mockResolvedValue({
      bookingId,
      recipientUserId: userId,
    });

    await notificationsService.scheduleReminder(bookingId, startAt, now);

    expect(findReminderRecipientMock).toHaveBeenCalledWith(
      bookingId,
      startAt,
      now,
    );
    expect(createReminderOutboxMock).toHaveBeenCalledWith(
      { bookingId, recipientUserId: userId },
      startAt,
    );
    expect(findPendingOutboxMock).not.toHaveBeenCalled();
    expect(addMock).not.toHaveBeenCalled();
  });

  it('does not enqueue a reminder for a booking that is no longer approved', async () => {
    findReminderRecipientMock.mockResolvedValue(null);

    await notificationsService.scheduleReminder(bookingId, startAt);

    expect(createReminderOutboxMock).not.toHaveBeenCalled();
    expect(findPendingOutboxMock).not.toHaveBeenCalled();
  });

  it('dispatches a reminder snapshot with a departure-stable job id', async () => {
    findPendingOutboxMock.mockResolvedValue([
      {
        bookingId,
        id: outboxId,
        kind: BookingNotificationOutboxKind.REMINDER,
        reason: null,
        recipientUserId: userId,
        startAt,
        status: BookingStatus.APPROVED,
      },
    ]);

    await expect(notificationsService.dispatchPending()).resolves.toBe(1);

    expect(addMock).toHaveBeenCalledWith(
      BOOKING_REMINDER_NOTIFICATION_JOB,
      {
        bookingId,
        outboxId,
        recipientUserId: userId,
        startAt: startAt.toISOString(),
      },
      expect.objectContaining({
        jobId: `booking-reminder-${bookingId}-${startAt.getTime()}`,
      }),
    );
  });

  it('leaves an undispatched outbox row recoverable when Redis add fails', async () => {
    findPendingOutboxMock.mockResolvedValue([
      {
        bookingId,
        id: outboxId,
        kind: BookingNotificationOutboxKind.STATUS,
        reason: 'Unavailable',
        recipientUserId: userId,
        startAt: null,
        status: BookingStatus.REJECTED,
      },
    ]);
    addMock.mockRejectedValue(new Error('Redis unavailable'));

    await expect(
      notificationsService.dispatchPending(new Date('2026-10-01T00:00:00Z')),
    ).resolves.toBe(0);

    expect(markOutboxDispatchedMock).not.toHaveBeenCalled();
    expect(markOutboxCheckedMock).toHaveBeenCalledWith(
      outboxId,
      new Date('2026-10-01T00:00:00Z'),
    );
  });

  it('does not automatically retry Bull jobs in the failed state', async () => {
    const failedJob = {
      getState: jest.fn().mockResolvedValue('failed'),
      remove: jest.fn(),
    };
    getJobMock.mockResolvedValue(failedJob);
    findPendingOutboxMock.mockResolvedValue([
      {
        bookingId,
        id: outboxId,
        kind: BookingNotificationOutboxKind.STATUS,
        reason: null,
        recipientUserId: userId,
        startAt: null,
        status: BookingStatus.APPROVED,
      },
    ]);

    await expect(notificationsService.dispatchPending()).resolves.toBe(0);

    expect(addMock).not.toHaveBeenCalled();
  });

  it('recreates a completed Redis job when its outbox row is still unprocessed', async () => {
    const completedJob = {
      getState: jest.fn().mockResolvedValue('completed'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    getJobMock.mockResolvedValue(completedJob);
    findOutboxByIdMock.mockResolvedValue({ id: outboxId, processedAt: null });
    findPendingOutboxMock.mockResolvedValue([
      {
        bookingId,
        id: outboxId,
        kind: BookingNotificationOutboxKind.STATUS,
        reason: null,
        recipientUserId: userId,
        startAt: null,
        status: BookingStatus.APPROVED,
      },
    ]);

    await expect(notificationsService.dispatchPending()).resolves.toBe(1);

    expect(completedJob.remove).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledTimes(1);
  });

  it('offers a manual retry for failed jobs whose outbox is still pending', async () => {
    const retryJobMock = jest.fn().mockResolvedValue(undefined);
    const failedJob = {
      data: { outboxId },
      remove: jest.fn(),
      retry: retryJobMock,
    } as unknown as Job<BookingNotificationJob>;
    const now = new Date('2026-10-01T00:00:00Z');
    getFailedMock.mockResolvedValue([failedJob]);
    findOutboxByIdMock.mockResolvedValue({
      bookingId,
      id: outboxId,
      processedAt: null,
    });

    await expect(
      notificationsService.retryFailedNotifications(now),
    ).resolves.toBe(1);

    expect(retryJobMock).toHaveBeenCalledTimes(1);
    expect(markOutboxDispatchedMock).toHaveBeenCalledWith(outboxId, now);
  });
});
