import type { EntityManager } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import type { BookingStatusChangedEvent } from '../bookings/interfaces/booking-status-changed.interface';
import { BookingNotificationOutboxKind } from './constants/notification.constants';
import { BookingNotificationOutboxEntity } from './entities/booking-notification-outbox.entity';
import { createStatusNotificationOutboxDeduplicationKey } from './notification-outbox.helpers';

export async function createStatusNotificationOutbox(
  manager: EntityManager,
  event: BookingStatusChangedEvent,
  recipientUserId: string,
): Promise<void> {
  if (
    event.toStatus !== BookingStatus.APPROVED &&
    event.toStatus !== BookingStatus.REJECTED
  ) {
    return;
  }

  const deduplicationKey = createStatusNotificationOutboxDeduplicationKey(
    event.bookingId,
    event.toStatus,
  );

  await manager
    .getRepository(BookingNotificationOutboxEntity)
    .createQueryBuilder()
    .insert()
    .values({
      bookingId: event.bookingId,
      deduplicationKey,
      kind: BookingNotificationOutboxKind.STATUS,
      recipientUserId,
      reason: event.reason,
      startAt: null,
      status: event.toStatus,
    })
    .orIgnore()
    .execute();
}
