import { IsNull } from 'typeorm';
import type { Repository } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingEntity } from '../bookings/entities/booking.entity';
import {
  BOOKING_NOTIFICATION_ELIGIBLE_DEPARTURE_STATUSES,
  BOOKING_NOTIFICATION_OUTBOX_PENDING_QUERY_FIELDS,
  BOOKING_NOTIFICATION_OUTBOX_PROCESSOR_QUERY_FIELDS,
  BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS,
  BOOKING_NOTIFICATION_REMINDER_PROCESSOR_QUERY_FIELDS,
  BOOKING_NOTIFICATION_REMINDER_QUERY_FIELDS,
  BookingNotificationDeliveryStatus,
  BookingNotificationOutboxKind,
} from './constants/notification.constants';
import { BookingNotificationOutboxEntity } from './entities/booking-notification-outbox.entity';
import { NotificationBookingsService } from './notification-bookings.service';

describe('NotificationBookingsService', () => {
  const bookingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const recipientUserId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const outboxId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const startAt = new Date('2027-03-10T09:30:00.000Z');
  const now = new Date('2027-03-09T09:30:00.000Z');
  let bookingQuery: Record<string, jest.Mock>;
  let outboxQuery: Record<string, jest.Mock>;
  let createBookingQueryBuilderMock: jest.Mock;
  let createOutboxQueryBuilderMock: jest.Mock;
  let outboxUpdateMock: jest.Mock;
  let notificationBookingsService: NotificationBookingsService;

  beforeEach(() => {
    bookingQuery = {
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    outboxQuery = {
      addOrderBy: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
      getMany: jest.fn(),
      getOne: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    };
    createBookingQueryBuilderMock = jest.fn().mockReturnValue(bookingQuery);
    createOutboxQueryBuilderMock = jest.fn().mockReturnValue(outboxQuery);
    outboxUpdateMock = jest.fn().mockResolvedValue(undefined);
    notificationBookingsService = new NotificationBookingsService(
      {
        createQueryBuilder: createBookingQueryBuilderMock,
      } as unknown as Repository<BookingEntity>,
      {
        createQueryBuilder: createOutboxQueryBuilderMock,
        update: outboxUpdateMock,
      } as unknown as Repository<BookingNotificationOutboxEntity>,
    );
  });

  it('selects only delivery fields for status email lookup', async () => {
    bookingQuery.getOne.mockResolvedValue({
      bookingCode: 'BT-ADMIN-APPROVE-001',
      user: { email: 'traveler@example.com' },
    });

    await expect(
      notificationBookingsService.findDelivery({
        bookingId,
        recipientUserId,
      }),
    ).resolves.toEqual({
      bookingCode: 'BT-ADMIN-APPROVE-001',
      recipientEmail: 'traveler@example.com',
    });

    expect(bookingQuery.select).toHaveBeenCalledWith(
      BOOKING_NOTIFICATION_PROCESSOR_QUERY_FIELDS,
    );
    expect(bookingQuery.where).toHaveBeenCalledWith('booking.id = :bookingId', {
      bookingId,
    });
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'booking.user_id = :recipientUserId',
      { recipientUserId },
    );
  });

  it('only creates reminder snapshots for approved future open or closed departures', async () => {
    bookingQuery.getOne.mockResolvedValue({
      id: bookingId,
      userId: recipientUserId,
    });

    await expect(
      notificationBookingsService.findReminderRecipient(
        bookingId,
        startAt,
        now,
      ),
    ).resolves.toEqual({ bookingId, recipientUserId });

    expect(bookingQuery.select).toHaveBeenCalledWith(
      BOOKING_NOTIFICATION_REMINDER_QUERY_FIELDS,
    );
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'booking.status = :status',
      { status: BookingStatus.APPROVED },
    );
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'departure.start_at = :startAt',
      { startAt },
    );
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'departure.start_at > :now',
      { now },
    );
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'departure.status IN (:...statuses)',
      { statuses: BOOKING_NOTIFICATION_ELIGIBLE_DEPARTURE_STATUSES },
    );
  });

  it.each([
    ['changed departure date', new Date('2027-03-11T09:30:00.000Z')],
    ['cancelled departure', startAt],
    ['elapsed departure', new Date('2027-03-08T09:30:00.000Z')],
  ])('does not select a reminder delivery for a %s', async () => {
    bookingQuery.getOne.mockResolvedValue(null);

    await expect(
      notificationBookingsService.findReminderDelivery(
        { bookingId, recipientUserId },
        startAt,
        now,
      ),
    ).resolves.toBeNull();

    expect(bookingQuery.select).toHaveBeenCalledWith(
      BOOKING_NOTIFICATION_REMINDER_PROCESSOR_QUERY_FIELDS,
    );
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'booking.status = :bookingStatus',
      { bookingStatus: BookingStatus.APPROVED },
    );
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'departure.status IN (:...statuses)',
      { statuses: BOOKING_NOTIFICATION_ELIGIBLE_DEPARTURE_STATUSES },
    );
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'departure.start_at = :startAt',
      { startAt },
    );
    expect(bookingQuery.andWhere).toHaveBeenCalledWith(
      'departure.start_at > :now',
      { now },
    );
  });

  it('uses explicit fields and a rotating order for pending outbox recovery', async () => {
    outboxQuery.getMany.mockResolvedValue([]);

    await notificationBookingsService.findPendingOutbox(25);

    expect(outboxQuery.select).toHaveBeenCalledWith(
      BOOKING_NOTIFICATION_OUTBOX_PENDING_QUERY_FIELDS,
    );
    expect(outboxQuery.where).toHaveBeenCalledWith(
      'outbox.processed_at IS NULL',
    );
    expect(outboxQuery.orderBy).toHaveBeenCalledWith(
      'outbox.last_checked_at',
      'ASC',
      'NULLS FIRST',
    );
    expect(outboxQuery.addOrderBy).toHaveBeenNthCalledWith(
      1,
      'outbox.created_at',
      'ASC',
    );
    expect(outboxQuery.addOrderBy).toHaveBeenNthCalledWith(
      2,
      'outbox.id',
      'ASC',
    );
    expect(outboxQuery.take).toHaveBeenCalledWith(25);
  });

  it('inserts reminder outbox rows idempotently by booking and departure time', async () => {
    await notificationBookingsService.createReminderOutbox(
      { bookingId, recipientUserId },
      startAt,
    );

    expect(outboxQuery.values).toHaveBeenCalledWith({
      bookingId,
      deduplicationKey: `reminder:${bookingId}:${startAt.toISOString()}`,
      kind: BookingNotificationOutboxKind.REMINDER,
      recipientUserId,
      reason: null,
      startAt,
      status: BookingStatus.APPROVED,
    });
    expect(outboxQuery.orIgnore).toHaveBeenCalledTimes(1);
  });

  it('selects outbox state needed to safely process a queued notification', async () => {
    outboxQuery.getOne.mockResolvedValue(null);

    await expect(
      notificationBookingsService.findOutboxById(outboxId),
    ).resolves.toBe(null);

    expect(outboxQuery.select).toHaveBeenCalledWith(
      BOOKING_NOTIFICATION_OUTBOX_PROCESSOR_QUERY_FIELDS,
    );
    expect(outboxQuery.where).toHaveBeenCalledWith('outbox.id = :outboxId', {
      outboxId,
    });
  });

  it('marks the outbox processed once with the final delivery disposition', async () => {
    await notificationBookingsService.markOutboxProcessed(
      outboxId,
      now,
      BookingNotificationDeliveryStatus.SKIPPED,
    );

    expect(outboxUpdateMock).toHaveBeenCalledWith(
      { id: outboxId, processedAt: IsNull() },
      {
        deliveryStatus: BookingNotificationDeliveryStatus.SKIPPED,
        processedAt: now,
      },
    );
  });
});
