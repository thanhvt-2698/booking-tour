import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { BookingStatus } from '../bookings/constants/booking.constants';
import { BookingStatusHistoryEntity } from '../bookings/entities/booking-status-history.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { DepartureStatus } from '../tours/constants/departure.constants';
import { TourDepartureEntity } from '../tours/entities/tour-departure.entity';
import {
  BOOKING_PENDING_EXPIRY_REASON,
  BOOKING_PENDING_TTL_HOURS_CONFIG_KEY,
  DEFAULT_BOOKING_PENDING_TTL_HOURS,
  DEFAULT_SCHEDULER_BATCH_SIZE,
  MILLISECONDS_PER_HOUR,
  SCHEDULER_BOOKING_EXPIRY_FAILURE_LOG_EVENT,
  SCHEDULER_BATCH_SIZE_CONFIG_KEY,
} from './constants/scheduler.constants';
import { SchedulerService } from './scheduler.service';

type FakeQueryBuilder = {
  addOrderBy: jest.Mock;
  andWhere: jest.Mock;
  execute: jest.Mock;
  getMany: jest.Mock;
  getOne: jest.Mock;
  innerJoinAndSelect: jest.Mock;
  orderBy: jest.Mock;
  select: jest.Mock;
  set: jest.Mock;
  setLock: jest.Mock;
  take: jest.Mock;
  update: jest.Mock;
  where: jest.Mock;
};

type FakeQueryResult = {
  affected?: number;
  many?: unknown[];
  one?: unknown;
};

type SchedulerServiceHarnessOptions = {
  batchSize?: number;
  bookingQueryBuilders?: FakeQueryBuilder[];
  departureQueryBuilders?: FakeQueryBuilder[];
  lockedBookingQueryBuilder?: FakeQueryBuilder;
  lockedBookingQueryBuilders?: FakeQueryBuilder[];
  lockedDepartureQueryBuilder?: FakeQueryBuilder;
  lockedDepartureQueryBuilders?: FakeQueryBuilder[];
};

describe('SchedulerService', () => {
  it('rechecks departure status and due timestamps in the lifecycle updates', async () => {
    const now = new Date('2035-06-01T12:00:00.000Z');
    const closeCandidates = createFakeQueryBuilder({
      many: [{ id: 'deadline-due' }],
    });
    const closeUpdate = createFakeQueryBuilder({ affected: 1 });
    const completionCandidates = createFakeQueryBuilder({
      many: [{ id: 'trip-ended' }],
    });
    const completionUpdate = createFakeQueryBuilder({ affected: 1 });
    const expiryCandidates = createFakeQueryBuilder();
    const reminderCandidates = createFakeQueryBuilder();
    const harness = createSchedulerServiceHarness({
      bookingQueryBuilders: [expiryCandidates, reminderCandidates],
      departureQueryBuilders: [
        closeCandidates,
        closeUpdate,
        completionCandidates,
        completionUpdate,
      ],
    });

    const summary = await harness.schedulerService.runDueJobs(now);

    expect(summary.departuresClosed).toBe(1);
    expect(summary.departuresCompleted).toBe(1);
    expect(closeCandidates.andWhere.mock.calls).toContainEqual([
      expect.stringContaining('departure.bookingDeadline'),
      { now },
    ]);
    expect(closeUpdate.andWhere.mock.calls).toContainEqual([
      expect.stringContaining('booking_deadline'),
      { now },
    ]);
    expect(completionCandidates.where.mock.calls).toContainEqual([
      'departure.status IN (:...eligibleStatuses)',
      { eligibleStatuses: [DepartureStatus.OPEN, DepartureStatus.CLOSED] },
    ]);
    expect(completionUpdate.andWhere.mock.calls).toContainEqual([
      'end_at <= :now',
      { now },
    ]);
    expect(harness.notifications.dispatchPending.mock.calls).toContainEqual([
      now,
    ]);
  });

  it('rechecks a pending booking after locking before releasing seats', async () => {
    const now = new Date('2035-06-01T12:00:00.000Z');
    const cutoff = new Date(
      now.getTime() - DEFAULT_BOOKING_PENDING_TTL_HOURS * MILLISECONDS_PER_HOUR,
    );
    const candidateQuery = createFakeQueryBuilder({
      many: [{ id: 'booking-now-approved' }],
    });
    const reminderQuery = createFakeQueryBuilder();
    const lockedBookingQuery = createFakeQueryBuilder({
      one: {
        createdAt: cutoff,
        departureId: 'departure-1',
        id: 'booking-now-approved',
        quantity: 1,
        status: BookingStatus.APPROVED,
      },
    });
    const harness = createSchedulerServiceHarness({
      bookingQueryBuilders: [candidateQuery, reminderQuery],
      lockedBookingQueryBuilder: lockedBookingQuery,
    });

    const summary = await harness.schedulerService.runDueJobs(now);

    expect(summary.bookingsScannedForExpiry).toBe(1);
    expect(summary.bookingsExpired).toBe(0);
    expect(harness.manager.getRepository.mock.calls).toHaveLength(1);
    expect(harness.manager.getRepository.mock.calls).toContainEqual([
      BookingEntity,
    ]);
    expect(harness.managerDepartureRepository.save.mock.calls).toHaveLength(0);
    expect(harness.managerHistoryRepository.save.mock.calls).toHaveLength(0);
  });

  it('expires a still-pending booking and writes system history in lock order', async () => {
    const now = new Date('2035-06-01T12:00:00.000Z');
    const cutoff = new Date(
      now.getTime() - DEFAULT_BOOKING_PENDING_TTL_HOURS * MILLISECONDS_PER_HOUR,
    );
    const lockedBooking = {
      cancelReason: null,
      createdAt: cutoff,
      departureId: 'departure-1',
      id: 'booking-expiring',
      quantity: 2,
      status: BookingStatus.PENDING,
    };
    const lockedDeparture = { bookedSeats: 3, id: lockedBooking.departureId };
    const candidateQuery = createFakeQueryBuilder({
      many: [{ id: lockedBooking.id }],
    });
    const reminderQuery = createFakeQueryBuilder();
    const lockedBookingQuery = createFakeQueryBuilder({ one: lockedBooking });
    const lockedDepartureQuery = createFakeQueryBuilder({
      one: lockedDeparture,
    });
    const harness = createSchedulerServiceHarness({
      bookingQueryBuilders: [candidateQuery, reminderQuery],
      lockedBookingQueryBuilder: lockedBookingQuery,
      lockedDepartureQueryBuilder: lockedDepartureQuery,
    });

    const summary = await harness.schedulerService.runDueJobs(now);

    expect(summary.bookingsExpired).toBe(1);
    expect(lockedBooking).toMatchObject({
      cancelReason: BOOKING_PENDING_EXPIRY_REASON,
      status: BookingStatus.CANCELLED,
    });
    expect(lockedDeparture.bookedSeats).toBe(1);
    expect(lockedBookingQuery.setLock.mock.calls).toContainEqual([
      'pessimistic_write',
    ]);
    expect(lockedDepartureQuery.setLock.mock.calls).toContainEqual([
      'pessimistic_write',
    ]);
    expect(
      harness.manager.getRepository.mock.calls.map((call) => call[0]),
    ).toEqual([
      BookingEntity,
      TourDepartureEntity,
      TourDepartureEntity,
      BookingEntity,
      BookingStatusHistoryEntity,
      BookingStatusHistoryEntity,
    ]);
    expect(harness.managerHistoryRepository.create.mock.calls).toContainEqual([
      {
        actorUserId: null,
        bookingId: lockedBooking.id,
        fromStatus: BookingStatus.PENDING,
        reason: BOOKING_PENDING_EXPIRY_REASON,
        toStatus: BookingStatus.CANCELLED,
      },
    ]);
  });

  it('rolls back expiry when booked seats cannot cover the pending quantity', async () => {
    const now = new Date('2035-06-01T12:00:00.000Z');
    const cutoff = new Date(
      now.getTime() - DEFAULT_BOOKING_PENDING_TTL_HOURS * MILLISECONDS_PER_HOUR,
    );
    const lockedBooking = {
      cancelReason: null,
      createdAt: cutoff,
      departureId: 'departure-1',
      id: 'booking-expiring',
      quantity: 2,
      status: BookingStatus.PENDING,
    };
    const candidateQuery = createFakeQueryBuilder({
      many: [{ id: lockedBooking.id }],
    });
    const lockedBookingQuery = createFakeQueryBuilder({ one: lockedBooking });
    const lockedDepartureQuery = createFakeQueryBuilder({
      one: { bookedSeats: 1, id: lockedBooking.departureId },
    });
    const harness = createSchedulerServiceHarness({
      bookingQueryBuilders: [candidateQuery],
      lockedBookingQueryBuilder: lockedBookingQuery,
      lockedDepartureQueryBuilder: lockedDepartureQuery,
    });

    await expect(
      harness.schedulerService.runDueJobs(now),
    ).resolves.toMatchObject({
      bookingsExpired: 0,
      bookingsFailedExpiry: 1,
    });

    expect(harness.dataSourceTransaction.mock.calls).toHaveLength(1);
    expect(harness.managerDepartureRepository.save.mock.calls).toHaveLength(0);
    expect(harness.managerBookingRepository.save.mock.calls).toHaveLength(0);
    expect(harness.managerHistoryRepository.save.mock.calls).toHaveLength(0);
    expect(lockedBooking).toMatchObject({
      cancelReason: null,
      status: BookingStatus.PENDING,
    });
  });

  it('logs a failed expiry and continues the batch, reminders, and dispatch', async () => {
    const now = new Date('2035-06-01T12:00:00.000Z');
    const cutoff = new Date(
      now.getTime() - DEFAULT_BOOKING_PENDING_TTL_HOURS * MILLISECONDS_PER_HOUR,
    );
    const failedBooking = {
      cancelReason: null,
      createdAt: cutoff,
      departureId: 'departure-with-inconsistent-seats',
      id: 'booking-with-inconsistent-seats',
      quantity: 2,
      status: BookingStatus.PENDING,
    };
    const validBooking = {
      cancelReason: null,
      createdAt: cutoff,
      departureId: 'departure-with-available-seats',
      id: 'booking-with-available-seats',
      quantity: 2,
      status: BookingStatus.PENDING,
    };
    const validDeparture = { bookedSeats: 3, id: validBooking.departureId };
    const candidateQuery = createFakeQueryBuilder({
      many: [{ id: failedBooking.id }, { id: validBooking.id }],
    });
    const reminderBooking = createReminderBooking('booking-reminder', now);
    const reminderQuery = createFakeQueryBuilder({ many: [reminderBooking] });
    const failedBookingLock = createFakeQueryBuilder({ one: failedBooking });
    const validBookingLock = createFakeQueryBuilder({ one: validBooking });
    const failedDepartureLock = createFakeQueryBuilder({
      one: { bookedSeats: 1, id: failedBooking.departureId },
    });
    const validDepartureLock = createFakeQueryBuilder({
      one: validDeparture,
    });
    const loggerErrorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    const harness = createSchedulerServiceHarness({
      bookingQueryBuilders: [candidateQuery, reminderQuery],
      lockedBookingQueryBuilders: [failedBookingLock, validBookingLock],
      lockedDepartureQueryBuilders: [failedDepartureLock, validDepartureLock],
    });

    const summary = await harness.schedulerService.runDueJobs(now);

    expect(summary.remindersSubmitted).toBe(1);
    expect(summary.bookingsScannedForExpiry).toBe(2);
    expect(summary.bookingsExpired).toBe(1);
    expect(summary.bookingsFailedExpiry).toBe(1);
    expect(failedBooking).toMatchObject({
      cancelReason: null,
      status: BookingStatus.PENDING,
    });
    expect(validBooking).toMatchObject({
      cancelReason: BOOKING_PENDING_EXPIRY_REASON,
      status: BookingStatus.CANCELLED,
    });
    expect(validDeparture.bookedSeats).toBe(1);
    expect(harness.managerHistoryRepository.save.mock.calls).toHaveLength(1);
    expect(harness.notifications.scheduleReminder.mock.calls).toEqual([
      [reminderBooking.id, reminderBooking.departure.startAt, now],
    ]);
    expect(harness.notifications.dispatchPending.mock.calls).toEqual([[now]]);
    expect(loggerErrorSpy.mock.calls).toHaveLength(1);
    expect(loggerErrorSpy.mock.calls[0]).toEqual([
      {
        bookingId: failedBooking.id,
        errorName: 'ConflictException',
        event: SCHEDULER_BOOKING_EXPIRY_FAILURE_LOG_EVENT,
      },
      undefined,
      SchedulerService.name,
    ]);
    loggerErrorSpy.mockRestore();
  });

  it('pages reminder candidates across runs and wraps the keyset cursor', async () => {
    const now = new Date('2035-06-01T12:00:00.000Z');
    const bookingOne = createReminderBooking('booking-1', now);
    const bookingTwo = createReminderBooking('booking-2', now);
    const bookingThree = createReminderBooking('booking-3', now);
    const reminderQueries = [
      createFakeQueryBuilder({ many: [bookingOne, bookingTwo] }),
      createFakeQueryBuilder({ many: [bookingThree] }),
      createFakeQueryBuilder(),
      createFakeQueryBuilder({ many: [bookingOne, bookingTwo] }),
    ];
    const bookingQueryBuilders = [
      createFakeQueryBuilder(),
      ...reminderQueries.slice(0, 1),
      createFakeQueryBuilder(),
      ...reminderQueries.slice(1, 2),
      createFakeQueryBuilder(),
      ...reminderQueries.slice(2),
    ];
    const harness = createSchedulerServiceHarness({
      batchSize: 2,
      bookingQueryBuilders,
      departureQueryBuilders: Array.from({ length: 6 }, () =>
        createFakeQueryBuilder(),
      ),
    });

    const firstRun = await harness.schedulerService.runDueJobs(now);
    const secondRun = await harness.schedulerService.runDueJobs(now);
    const thirdRun = await harness.schedulerService.runDueJobs(now);

    expect(firstRun.remindersSubmitted).toBe(2);
    expect(secondRun.remindersSubmitted).toBe(1);
    expect(thirdRun.remindersSubmitted).toBe(2);
    expect(harness.notifications.scheduleReminder.mock.calls).toEqual([
      [bookingOne.id, bookingOne.departure.startAt, now],
      [bookingTwo.id, bookingTwo.departure.startAt, now],
      [bookingThree.id, bookingThree.departure.startAt, now],
      [bookingOne.id, bookingOne.departure.startAt, now],
      [bookingTwo.id, bookingTwo.departure.startAt, now],
    ]);
    expect(reminderQueries[1].andWhere.mock.calls).toContainEqual([
      'booking.id > :afterBookingId',
      { afterBookingId: bookingTwo.id },
    ]);
    expect(reminderQueries[2].andWhere.mock.calls).toContainEqual([
      'booking.id > :afterBookingId',
      { afterBookingId: bookingThree.id },
    ]);
    expect(harness.notifications.dispatchPending.mock.calls).toHaveLength(3);
  });
});

function createFakeQueryBuilder(
  result: FakeQueryResult = {},
): FakeQueryBuilder {
  const builder = {} as FakeQueryBuilder;
  const chainableMethods: Array<keyof FakeQueryBuilder> = [
    'addOrderBy',
    'andWhere',
    'innerJoinAndSelect',
    'orderBy',
    'select',
    'set',
    'setLock',
    'take',
    'update',
    'where',
  ];

  for (const method of chainableMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  builder.getMany = jest.fn().mockResolvedValue(result.many ?? []);
  builder.getOne = jest.fn().mockResolvedValue(result.one ?? null);
  builder.execute = jest
    .fn()
    .mockResolvedValue({ affected: result.affected ?? 0 });

  return builder;
}

function createReminderBooking(id: string, now: Date): BookingEntity {
  return Object.assign(new BookingEntity(), {
    departure: {
      id: `departure-${id}`,
      startAt: new Date(now.getTime() + MILLISECONDS_PER_HOUR),
    },
    id,
  });
}

function createSchedulerServiceHarness(
  options: SchedulerServiceHarnessOptions = {},
) {
  const bookingQueryQueue = [...(options.bookingQueryBuilders ?? [])];
  const departureQueryQueue = [...(options.departureQueryBuilders ?? [])];
  const lockedBookingQueryQueue = [
    ...(options.lockedBookingQueryBuilders ?? []),
  ];
  const lockedDepartureQueryQueue = [
    ...(options.lockedDepartureQueryBuilders ?? []),
  ];
  if (options.lockedBookingQueryBuilder) {
    lockedBookingQueryQueue.push(options.lockedBookingQueryBuilder);
  }
  if (options.lockedDepartureQueryBuilder) {
    lockedDepartureQueryQueue.push(options.lockedDepartureQueryBuilder);
  }
  const bookingsRepository = {
    createQueryBuilder: jest.fn(
      () => bookingQueryQueue.shift() ?? createFakeQueryBuilder(),
    ),
  } as unknown as Repository<BookingEntity>;
  const departuresRepository = {
    createQueryBuilder: jest.fn(
      () => departureQueryQueue.shift() ?? createFakeQueryBuilder(),
    ),
  } as unknown as Repository<TourDepartureEntity>;
  const managerBookingRepository = {
    createQueryBuilder: jest.fn(
      () => lockedBookingQueryQueue.shift() ?? createFakeQueryBuilder(),
    ),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
  };
  const managerDepartureRepository = {
    createQueryBuilder: jest.fn(
      () => lockedDepartureQueryQueue.shift() ?? createFakeQueryBuilder(),
    ),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
  };
  const managerHistoryRepository = {
    create: jest.fn((input: unknown) => input),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === BookingEntity) {
        return managerBookingRepository;
      }
      if (entity === TourDepartureEntity) {
        return managerDepartureRepository;
      }
      if (entity === BookingStatusHistoryEntity) {
        return managerHistoryRepository;
      }

      throw new Error('Unexpected repository in scheduler transaction');
    }),
  };
  const dataSourceTransaction = jest.fn(
    (operation: (transactionManager: EntityManager) => Promise<unknown>) =>
      operation(manager as unknown as EntityManager),
  );
  const configService = {
    get: jest.fn((key: string) => {
      if (key === SCHEDULER_BATCH_SIZE_CONFIG_KEY) {
        return options.batchSize ?? DEFAULT_SCHEDULER_BATCH_SIZE;
      }
      if (key === BOOKING_PENDING_TTL_HOURS_CONFIG_KEY) {
        return DEFAULT_BOOKING_PENDING_TTL_HOURS;
      }

      return undefined;
    }),
  } as unknown as ConfigService;
  const notifications = {
    dispatchPending: jest.fn().mockResolvedValue(0),
    scheduleReminder: jest.fn().mockResolvedValue(undefined),
  };
  const schedulerService = new SchedulerService(
    { transaction: dataSourceTransaction } as unknown as DataSource,
    configService,
    notifications as unknown as NotificationsService,
    bookingsRepository,
    departuresRepository,
  );

  return {
    dataSourceTransaction,
    manager,
    managerBookingRepository,
    managerDepartureRepository,
    managerHistoryRepository,
    notifications,
    schedulerService,
  };
}
