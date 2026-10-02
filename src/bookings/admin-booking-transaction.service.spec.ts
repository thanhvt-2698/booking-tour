import type { EntityManager } from 'typeorm';
import { createStatusNotificationOutbox } from '../notifications/booking-notification-outbox.writer';
import { BookingStatus } from './constants/booking.constants';
import { AdminBookingTransactionService } from './admin-booking-transaction.service';

jest.mock('../notifications/booking-notification-outbox.writer', () => ({
  createStatusNotificationOutbox: jest.fn(),
}));

describe('AdminBookingTransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes the outbox through the current transaction manager', async () => {
    const manager = {} as EntityManager;
    const event = {
      actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      bookingId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      fromStatus: BookingStatus.PENDING,
      reason: null,
      toStatus: BookingStatus.APPROVED,
    };
    const recipientUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const transactionService = new AdminBookingTransactionService(manager);

    await transactionService.saveNotificationOutbox(event, recipientUserId);

    expect(createStatusNotificationOutbox).toHaveBeenCalledWith(
      manager,
      event,
      recipientUserId,
    );
  });
});
