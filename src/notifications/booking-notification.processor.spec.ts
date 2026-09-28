import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bull';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BOOKING_STATUS_NOTIFICATION_JOB } from './constants/notification.constants';
import type { BookingNotificationJob } from './interfaces/booking-notification-job.interface';
import type { MailMessage } from './interfaces/mail-message.interface';
import type { MailSender } from './interfaces/mail-sender.interface';
import { BookingNotificationProcessor } from './booking-notification.processor';
import { NotificationBookingsStore } from './notification-bookings.store';

describe('BookingNotificationProcessor', () => {
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const recipientUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  let getOrThrowMock: jest.Mock;
  let findDeliveryMock: jest.Mock;
  let mailSendMock: jest.Mock;
  let mailSender: MailSender;
  let processor: BookingNotificationProcessor;

  beforeEach(() => {
    getOrThrowMock = jest.fn().mockReturnValue('no-reply@example.com');
    findDeliveryMock = jest.fn().mockResolvedValue({
      bookingCode: 'BT-ADMIN-APPROVE-001',
      recipientEmail: 'traveler@example.com',
    });
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
      } as unknown as NotificationBookingsStore,
    );
  });

  it('sends an approved email using selected booking and recipient fields', async () => {
    await processor.process({
      data: {
        bookingId,
        reason: null,
        recipientUserId,
        status: BookingStatus.APPROVED,
      },
      name: BOOKING_STATUS_NOTIFICATION_JOB,
    } as Job<BookingNotificationJob>);

    expect(findDeliveryMock).toHaveBeenCalledWith({
      bookingId,
      reason: null,
      recipientUserId,
      status: BookingStatus.APPROVED,
    });
    expect(mailSendMock).toHaveBeenCalledWith({
      from: 'no-reply@example.com',
      subject: 'Booking BT-ADMIN-APPROVE-001 has been approved',
      text: 'Your booking BT-ADMIN-APPROVE-001 has been approved.',
      to: 'traveler@example.com',
    });
  });

  it('fails the job when its booking recipient is no longer available', async () => {
    findDeliveryMock.mockResolvedValue(null);

    await expect(
      processor.process({
        data: {
          bookingId,
          reason: 'Missing required information',
          recipientUserId,
          status: BookingStatus.REJECTED,
        },
        name: BOOKING_STATUS_NOTIFICATION_JOB,
      } as Job<BookingNotificationJob>),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mailSendMock).not.toHaveBeenCalled();
  });
});
