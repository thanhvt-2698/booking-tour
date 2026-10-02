import type { EntityManager } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import type { BookingStatusChangedEvent } from '../bookings/interfaces/booking-status-changed.interface';
import { BookingNotificationOutboxKind } from './constants/notification.constants';
import { BookingNotificationOutboxEntity } from './entities/booking-notification-outbox.entity';
import { createStatusNotificationOutbox } from './booking-notification-outbox.writer';

describe('createStatusNotificationOutbox', () => {
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const recipientUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  let valuesMock: jest.Mock;
  let getRepositoryMock: jest.Mock;
  let manager: EntityManager;

  beforeEach(() => {
    valuesMock = jest.fn().mockReturnThis();
    getRepositoryMock = jest.fn();
    const queryBuilder = {
      execute: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      values: valuesMock,
    };
    getRepositoryMock.mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    });
    manager = {
      getRepository: getRepositoryMock,
    } as unknown as EntityManager;
  });

  it('writes approved status snapshots idempotently inside the caller transaction', async () => {
    const event: BookingStatusChangedEvent = {
      actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      bookingId,
      fromStatus: BookingStatus.PENDING,
      reason: null,
      toStatus: BookingStatus.APPROVED,
    };

    await createStatusNotificationOutbox(manager, event, recipientUserId);

    expect(getRepositoryMock).toHaveBeenCalledWith(
      BookingNotificationOutboxEntity,
    );
    expect(valuesMock).toHaveBeenCalledWith({
      bookingId,
      deduplicationKey: `status:${bookingId}:approved`,
      kind: BookingNotificationOutboxKind.STATUS,
      recipientUserId,
      reason: null,
      startAt: null,
      status: BookingStatus.APPROVED,
    });
  });

  it('does not insert outbox rows for unrelated booking statuses', async () => {
    const event: BookingStatusChangedEvent = {
      actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      bookingId,
      fromStatus: BookingStatus.PENDING,
      reason: null,
      toStatus: BookingStatus.CANCELLED,
    };

    await createStatusNotificationOutbox(manager, event, recipientUserId);

    expect(getRepositoryMock).not.toHaveBeenCalled();
  });
});
