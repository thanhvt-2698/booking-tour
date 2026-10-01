import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bull';
import { BookingStatus } from '../bookings/constants/booking.constants';
import {
  BOOKING_REMINDER_NOTIFICATION_JOB,
  BOOKING_STATUS_NOTIFICATION_JOB,
  MAIL_ENABLED_CONFIG_KEY,
  BookingNotificationDeliveryStatus,
  BookingNotificationOutboxKind,
} from './constants/notification.constants';
import type { BookingReminderNotificationJob } from './interfaces/booking-reminder-notification-job.interface';
import type { BookingStatusNotificationJob } from './interfaces/booking-status-notification-job.interface';
import type { LegacyBookingStatusNotificationJob } from './interfaces/legacy-booking-status-notification-job.interface';
import type { MailMessage } from './interfaces/mail-message.interface';
import type { MailSender } from './interfaces/mail-sender.interface';
import type { NotificationBookingsService } from './notification-bookings.service';
import { BookingNotificationProcessor } from './booking-notification.processor';

describe('BookingNotificationProcessor', () => {
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const recipientUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const outboxId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const startAt = '2027-03-10T09:30:00.000Z';
  let getOrThrowMock: jest.Mock;
  let findOutboxByIdMock: jest.Mock;
  let findDeliveryMock: jest.Mock;
  let findReminderDeliveryMock: jest.Mock;
  let ensureLegacyStatusOutboxMock: jest.Mock;
  let markOutboxProcessedMock: jest.Mock;
  let mailSendMock: jest.Mock;
  let mailSender: MailSender;
  let processor: BookingNotificationProcessor;

  beforeEach(() => {
    getOrThrowMock = jest.fn((key: string) =>
      key === MAIL_ENABLED_CONFIG_KEY ? true : 'no-reply@example.com',
    );
    findOutboxByIdMock = jest.fn().mockResolvedValue({
      id: outboxId,
      kind: BookingNotificationOutboxKind.STATUS,
      processedAt: null,
      startAt: null,
    });
    findDeliveryMock = jest.fn().mockResolvedValue({
      bookingCode: 'BT-ADMIN-APPROVE-001',
      recipientEmail: 'traveler@example.com',
    });
    findReminderDeliveryMock = jest.fn().mockResolvedValue({
      bookingCode: 'BT-ADMIN-APPROVE-001',
      recipientEmail: 'traveler@example.com',
    });
    ensureLegacyStatusOutboxMock = jest.fn().mockResolvedValue({
      id: outboxId,
      kind: BookingNotificationOutboxKind.STATUS,
      processedAt: null,
      startAt: null,
    });
    markOutboxProcessedMock = jest.fn().mockResolvedValue(undefined);
    mailSendMock = jest.fn();
    mailSender = {
      send: (message: MailMessage): Promise<void> => {
        mailSendMock(message);

        return Promise.resolve();
      },
    };
    processor = new BookingNotificationProcessor(
      { getOrThrow: getOrThrowMock } as unknown as ConfigService,
      mailSender,
      {
        findDelivery: findDeliveryMock,
        findOutboxById: findOutboxByIdMock,
        findReminderDelivery: findReminderDeliveryMock,
        ensureLegacyStatusOutbox: ensureLegacyStatusOutboxMock,
        markOutboxProcessed: markOutboxProcessedMock,
      } as unknown as NotificationBookingsService,
    );
  });

  it('sends an approved status email and records completion', async () => {
    const data: BookingStatusNotificationJob = {
      bookingId,
      outboxId,
      reason: null,
      recipientUserId,
      status: BookingStatus.APPROVED,
    };
    await processor.processStatus({
      data,
      name: BOOKING_STATUS_NOTIFICATION_JOB,
    } as Job<BookingStatusNotificationJob>);

    expect(findOutboxByIdMock).toHaveBeenCalledWith(outboxId);
    expect(findDeliveryMock).toHaveBeenCalledWith(data);
    expect(mailSendMock).toHaveBeenCalledWith({
      from: 'no-reply@example.com',
      subject: 'Booking BT-ADMIN-APPROVE-001 has been approved',
      text: 'Your booking BT-ADMIN-APPROVE-001 has been approved.',
      to: 'traveler@example.com',
    });
    expect(markOutboxProcessedMock).toHaveBeenCalledWith(
      outboxId,
      expect.any(Date),
      BookingNotificationDeliveryStatus.SENT,
    );
  });

  it('upgrades a queued legacy status job to the matching durable outbox row', async () => {
    const data: LegacyBookingStatusNotificationJob = {
      bookingId,
      reason: null,
      recipientUserId,
      status: BookingStatus.APPROVED,
    };

    await processor.processStatus({
      data,
      name: BOOKING_STATUS_NOTIFICATION_JOB,
    } as Job<LegacyBookingStatusNotificationJob>);

    expect(ensureLegacyStatusOutboxMock).toHaveBeenCalledWith(data);
    expect(findOutboxByIdMock).toHaveBeenCalledWith(outboxId);
    expect(mailSendMock).toHaveBeenCalledTimes(1);
    expect(markOutboxProcessedMock).toHaveBeenCalledWith(
      outboxId,
      expect.any(Date),
      BookingNotificationDeliveryStatus.SENT,
    );
  });

  it('retries a status job when its recipient is no longer available', async () => {
    findDeliveryMock.mockResolvedValue(null);

    await expect(
      processor.processStatus({
        data: {
          bookingId,
          outboxId,
          reason: 'Missing required information',
          recipientUserId,
          status: BookingStatus.REJECTED,
        },
        name: BOOKING_STATUS_NOTIFICATION_JOB,
      } as Job<BookingStatusNotificationJob>),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mailSendMock).not.toHaveBeenCalled();
  });

  it('records a disabled mail delivery as skipped while preserving the mailer call', async () => {
    getOrThrowMock.mockImplementation((key: string) =>
      key === MAIL_ENABLED_CONFIG_KEY ? false : 'no-reply@example.com',
    );

    await processor.processStatus({
      data: {
        bookingId,
        outboxId,
        reason: null,
        recipientUserId,
        status: BookingStatus.APPROVED,
      },
      name: BOOKING_STATUS_NOTIFICATION_JOB,
    } as Job<BookingStatusNotificationJob>);

    expect(mailSendMock).toHaveBeenCalledTimes(1);
    expect(markOutboxProcessedMock).toHaveBeenCalledWith(
      outboxId,
      expect.any(Date),
      BookingNotificationDeliveryStatus.SKIPPED,
    );
  });

  it('sends a reminder with the recorded departure time', async () => {
    findOutboxByIdMock.mockResolvedValue({
      id: outboxId,
      kind: BookingNotificationOutboxKind.REMINDER,
      processedAt: null,
      startAt: new Date(startAt),
    });
    const data: BookingReminderNotificationJob = {
      bookingId,
      outboxId,
      recipientUserId,
      startAt,
    };

    await processor.processReminder({
      data,
      name: BOOKING_REMINDER_NOTIFICATION_JOB,
    } as Job<BookingReminderNotificationJob>);

    expect(findReminderDeliveryMock).toHaveBeenCalledWith(
      data,
      new Date(startAt),
      expect.any(Date),
    );
    expect(mailSendMock).toHaveBeenCalledWith({
      from: 'no-reply@example.com',
      subject: 'Reminder: booking BT-ADMIN-APPROVE-001 starts soon',
      text: `Your tour for booking BT-ADMIN-APPROVE-001 starts at ${startAt}.`,
      to: 'traveler@example.com',
    });
    expect(markOutboxProcessedMock).toHaveBeenCalledWith(
      outboxId,
      expect.any(Date),
      BookingNotificationDeliveryStatus.SENT,
    );
  });

  it.each([
    'booking was cancelled',
    'departure was cancelled',
    'departure time elapsed',
  ])('skips a reminder when the %s', async () => {
    findOutboxByIdMock.mockResolvedValue({
      id: outboxId,
      kind: BookingNotificationOutboxKind.REMINDER,
      processedAt: null,
      startAt: new Date(startAt),
    });
    findReminderDeliveryMock.mockResolvedValue(null);

    await processor.processReminder({
      data: {
        bookingId,
        outboxId,
        recipientUserId,
        startAt,
      },
      name: BOOKING_REMINDER_NOTIFICATION_JOB,
    } as Job<BookingReminderNotificationJob>);

    expect(mailSendMock).not.toHaveBeenCalled();
    expect(markOutboxProcessedMock).toHaveBeenCalledWith(
      outboxId,
      expect.any(Date),
      BookingNotificationDeliveryStatus.SKIPPED,
    );
  });

  it('does not send an already processed outbox row again', async () => {
    findOutboxByIdMock.mockResolvedValue({
      id: outboxId,
      kind: BookingNotificationOutboxKind.STATUS,
      processedAt: new Date(),
    });

    await processor.processStatus({
      data: {
        bookingId,
        outboxId,
        reason: null,
        recipientUserId,
        status: BookingStatus.APPROVED,
      },
      name: BOOKING_STATUS_NOTIFICATION_JOB,
    } as Job<BookingStatusNotificationJob>);

    expect(findDeliveryMock).not.toHaveBeenCalled();
    expect(mailSendMock).not.toHaveBeenCalled();
    expect(markOutboxProcessedMock).not.toHaveBeenCalled();
  });
});
