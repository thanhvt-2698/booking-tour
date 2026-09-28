import type { Repository, SelectQueryBuilder } from 'typeorm';
import { BookingEntity } from '../bookings/entities/booking.entity';
import {
  BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS,
  BOOKING_NOTIFICATION_QUERY_FIELDS,
} from './constants/notification.constants';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { NotificationBookingsStore } from './notification-bookings.store';

describe('NotificationBookingsStore', () => {
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const recipientUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  let createQueryBuilderMock: jest.Mock;
  let findOneMock: jest.Mock;
  let notificationBookingsStore: NotificationBookingsStore;

  beforeEach(() => {
    createQueryBuilderMock = jest.fn();
    findOneMock = jest.fn();
    notificationBookingsStore = new NotificationBookingsStore({
      createQueryBuilder: createQueryBuilderMock,
      findOne: findOneMock,
    } as unknown as Repository<BookingEntity>);
  });

  it('selects only identifiers while finding a notification recipient', async () => {
    findOneMock.mockResolvedValue({ id: bookingId, userId: recipientUserId });

    await expect(
      notificationBookingsStore.findRecipient(bookingId),
    ).resolves.toEqual({ bookingId, recipientUserId });
    expect(findOneMock).toHaveBeenCalledWith({
      select: BOOKING_NOTIFICATION_QUERY_FIELDS,
      where: { id: bookingId },
    });
  });

  it('selects the booking code and recipient email for delivery', async () => {
    const selectMock = jest.fn().mockReturnThis();
    const query = {
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        bookingCode: 'BT-ADMIN-APPROVE-001',
        user: { email: 'traveler@example.com' },
      }),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      select: selectMock,
      where: jest.fn().mockReturnThis(),
    } as unknown as SelectQueryBuilder<BookingEntity>;
    createQueryBuilderMock.mockReturnValue(query);

    await expect(
      notificationBookingsStore.findDelivery({
        bookingId,
        reason: null,
        recipientUserId,
        status: BookingStatus.APPROVED,
      }),
    ).resolves.toEqual({
      bookingCode: 'BT-ADMIN-APPROVE-001',
      recipientEmail: 'traveler@example.com',
    });
    expect(selectMock).toHaveBeenCalledWith(
      BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS,
    );
  });
});
