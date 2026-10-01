import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import type { Repository } from 'typeorm';
import { BookingStatus } from '../src/bookings/constants/booking.constants';
import { BookingStatusHistoryEntity } from '../src/bookings/entities/booking-status-history.entity';
import { BookingEntity } from '../src/bookings/entities/booking.entity';
import { CategoryStatus } from '../src/categories/constants/category.constants';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import {
  BOOKING_PENDING_EXPIRY_REASON,
  BOOKING_PENDING_TTL_HOURS_CONFIG_KEY,
  BOOKING_REMINDER_LEAD_HOURS,
  DEFAULT_BOOKING_PENDING_TTL_HOURS,
  MILLISECONDS_PER_HOUR,
} from '../src/scheduler/constants/scheduler.constants';
import { SchedulerService } from '../src/scheduler/scheduler.service';
import { DepartureStatus } from '../src/tours/constants/departure.constants';
import { TourDepartureEntity } from '../src/tours/entities/tour-departure.entity';
import { TourEntity } from '../src/tours/entities/tour.entity';
import { TourStatus } from '../src/tours/constants/tour.constants';
import { UserRole, UserStatus } from '../src/users/constants/user.constants';
import { UserEntity } from '../src/users/entities/user.entity';
import { NotificationsService } from '../src/notifications/notifications.service';

describe('Scheduler (e2e)', () => {
  const requireFromSchedulerE2e = createRequire(__filename);
  const TEST_SCHEDULER_BATCH_SIZE = 2;
  let app: INestApplication;
  let bookingsRepository: Repository<BookingEntity>;
  let categoriesRepository: Repository<CategoryEntity>;
  let departuresRepository: Repository<TourDepartureEntity>;
  let historiesRepository: Repository<BookingStatusHistoryEntity>;
  let schedulerService: SchedulerService;
  let toursRepository: Repository<TourEntity>;
  let usersRepository: Repository<UserEntity>;
  let userId: string;
  let tourId: string;
  let remindersSubmittedToFakeQueue: Set<string>;
  let reminderScheduleCalls: string[];
  let notificationServiceMock: {
    dispatchPending: jest.Mock<Promise<number>, [Date?]>;
    scheduleReminder: jest.Mock<Promise<void>, [string, Date, Date?]>;
  };
  let originalSchedulerEnabled: string | undefined;
  let originalSchedulerBatchSize: string | undefined;
  let originalPendingTtlHours: string | undefined;

  beforeEach(async () => {
    if (
      !/^(?:booking_tour_f00_[a-z0-9_]+_test|booking_tour_ci_test)$/.test(
        process.env.DB_TEST_NAME ?? '',
      )
    ) {
      throw new Error(
        'E2E requires booking_tour_ci_test or a disposable booking_tour_f00_*_test database',
      );
    }

    originalSchedulerEnabled = process.env.SCHEDULER_ENABLED;
    originalSchedulerBatchSize = process.env.SCHEDULER_BATCH_SIZE;
    originalPendingTtlHours = process.env[BOOKING_PENDING_TTL_HOURS_CONFIG_KEY];
    process.env.SCHEDULER_ENABLED = 'false';
    process.env.SCHEDULER_BATCH_SIZE = String(TEST_SCHEDULER_BATCH_SIZE);
    process.env[BOOKING_PENDING_TTL_HOURS_CONFIG_KEY] = String(
      DEFAULT_BOOKING_PENDING_TTL_HOURS,
    );

    remindersSubmittedToFakeQueue = new Set<string>();
    reminderScheduleCalls = [];
    notificationServiceMock = {
      dispatchPending: jest.fn<Promise<number>, [Date?]>().mockResolvedValue(0),
      scheduleReminder: jest
        .fn<Promise<void>, [string, Date, Date?]>()
        .mockImplementation((bookingId: string): Promise<void> => {
          reminderScheduleCalls.push(bookingId);
          remindersSubmittedToFakeQueue.add(bookingId);
          return Promise.resolve();
        }),
    };

    const { AppModule } = requireFromSchedulerE2e(
      '../src/app.module',
    ) as typeof import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationsService)
      .useValue(notificationServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    bookingsRepository = app.get<Repository<BookingEntity>>(
      getRepositoryToken(BookingEntity),
    );
    categoriesRepository = app.get<Repository<CategoryEntity>>(
      getRepositoryToken(CategoryEntity),
    );
    departuresRepository = app.get<Repository<TourDepartureEntity>>(
      getRepositoryToken(TourDepartureEntity),
    );
    historiesRepository = app.get<Repository<BookingStatusHistoryEntity>>(
      getRepositoryToken(BookingStatusHistoryEntity),
    );
    toursRepository = app.get<Repository<TourEntity>>(
      getRepositoryToken(TourEntity),
    );
    usersRepository = app.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
    schedulerService = app.get(SchedulerService);

    await bookingsRepository.query(
      'TRUNCATE TABLE "bookings" RESTART IDENTITY CASCADE',
    );
    await departuresRepository.query(
      'TRUNCATE TABLE "tour_departures" RESTART IDENTITY CASCADE',
    );
    await toursRepository.query(
      'TRUNCATE TABLE "tours" RESTART IDENTITY CASCADE',
    );
    await categoriesRepository.query(
      'TRUNCATE TABLE "categories" RESTART IDENTITY CASCADE',
    );
    await usersRepository.query(
      'TRUNCATE TABLE "users" RESTART IDENTITY CASCADE',
    );

    const user = await usersRepository.save(
      usersRepository.create({
        email: 'scheduler-user@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    );
    userId = user.id;

    const category = await categoriesRepository.save(
      categoriesRepository.create({
        name: 'Scheduler category',
        slug: 'scheduler-category',
        status: CategoryStatus.ACTIVE,
      }),
    );
    const tour = await toursRepository.save(
      toursRepository.create({
        basePrice: '100.00',
        categoryId: category.id,
        code: 'SCHEDULER-TOUR',
        createdBy: user.id,
        currency: 'USD',
        description: 'Tour used in scheduler integration tests',
        slug: 'scheduler-tour',
        status: TourStatus.PUBLISHED,
        title: 'Scheduler tour',
      }),
    );
    tourId = tour.id;
  });

  afterEach(async () => {
    await app.close();
    restoreEnvironmentVariable('SCHEDULER_ENABLED', originalSchedulerEnabled);
    restoreEnvironmentVariable(
      'SCHEDULER_BATCH_SIZE',
      originalSchedulerBatchSize,
    );
    restoreEnvironmentVariable(
      BOOKING_PENDING_TTL_HOURS_CONFIG_KEY,
      originalPendingTtlHours,
    );
  });

  it('closes and completes only eligible departures and expires pending bookings once', async () => {
    const now = new Date('2035-06-01T12:00:00.000Z');
    const cutoff = new Date(
      now.getTime() - DEFAULT_BOOKING_PENDING_TTL_HOURS * MILLISECONDS_PER_HOUR,
    );
    const deadlineDue = await createDeparture({
      bookingDeadline: now,
      endAt: new Date('2035-06-07T12:00:00.000Z'),
      startAt: new Date('2035-06-06T12:00:00.000Z'),
    });
    const startDue = await createDeparture({
      bookingDeadline: null,
      endAt: new Date('2035-06-03T12:00:00.000Z'),
      startAt: now,
    });
    const openTripEnded = await createDeparture({
      bookingDeadline: null,
      endAt: now,
      startAt: new Date('2035-05-30T12:00:00.000Z'),
    });
    const closedTripEnded = await createDeparture({
      bookingDeadline: null,
      endAt: new Date(now.getTime() - 1),
      startAt: new Date('2035-05-29T12:00:00.000Z'),
      status: DepartureStatus.CLOSED,
    });
    const cancelledTripEnded = await createDeparture({
      endAt: new Date('2035-05-31T12:00:00.000Z'),
      startAt: new Date('2035-05-28T12:00:00.000Z'),
      status: DepartureStatus.CANCELLED,
    });
    const expiryDeparture = await createDeparture({
      bookedSeats: 3,
      endAt: new Date('2035-06-07T12:00:00.000Z'),
      startAt: new Date('2035-06-06T12:00:00.000Z'),
    });
    const expiredBooking = await createBooking({
      createdAt: cutoff,
      departureId: expiryDeparture.id,
      quantity: 2,
      status: BookingStatus.PENDING,
    });
    const recentBooking = await createBooking({
      createdAt: new Date(cutoff.getTime() + 1),
      departureId: expiryDeparture.id,
      status: BookingStatus.PENDING,
    });

    const firstRun = await schedulerService.runDueJobs(now);
    const secondRun = await schedulerService.runDueJobs(now);

    const savedDepartures = await departuresRepository.find({
      select: ['id', 'status', 'bookedSeats'],
      where: [
        { id: deadlineDue.id },
        { id: startDue.id },
        { id: openTripEnded.id },
        { id: closedTripEnded.id },
        { id: cancelledTripEnded.id },
        { id: expiryDeparture.id },
      ],
    });
    const byId = new Map(
      savedDepartures.map((departure) => [departure.id, departure]),
    );
    const savedExpiredBooking = await bookingsRepository.findOne({
      select: ['id', 'status', 'cancelReason'],
      where: { id: expiredBooking.id },
    });
    const savedRecentBooking = await bookingsRepository.findOne({
      select: ['id', 'status'],
      where: { id: recentBooking.id },
    });
    const expiryHistories = await historiesRepository.find({
      select: ['actorUserId', 'bookingId', 'fromStatus', 'reason', 'toStatus'],
      where: { bookingId: expiredBooking.id },
    });

    expect(firstRun.departuresClosed).toBe(2);
    expect(firstRun.departuresCompleted).toBe(2);
    expect(firstRun.bookingsExpired).toBe(1);
    expect(secondRun.bookingsExpired).toBe(0);
    expect(byId.get(deadlineDue.id)?.status).toBe(DepartureStatus.CLOSED);
    expect(byId.get(startDue.id)?.status).toBe(DepartureStatus.CLOSED);
    expect(byId.get(openTripEnded.id)?.status).toBe(DepartureStatus.COMPLETED);
    expect(byId.get(closedTripEnded.id)?.status).toBe(
      DepartureStatus.COMPLETED,
    );
    expect(byId.get(cancelledTripEnded.id)?.status).toBe(
      DepartureStatus.CANCELLED,
    );
    expect(byId.get(expiryDeparture.id)?.bookedSeats).toBe(1);
    expect(savedExpiredBooking).toMatchObject({
      cancelReason: BOOKING_PENDING_EXPIRY_REASON,
      status: BookingStatus.CANCELLED,
    });
    expect(savedRecentBooking?.status).toBe(BookingStatus.PENDING);
    expect(expiryHistories).toHaveLength(1);
    expect(expiryHistories[0]).toMatchObject({
      actorUserId: null,
      fromStatus: BookingStatus.PENDING,
      reason: BOOKING_PENDING_EXPIRY_REASON,
      toStatus: BookingStatus.CANCELLED,
    });
  });

  it('pages through reminders, includes the 24-hour boundary, and delegates deduplication', async () => {
    const now = new Date('2035-06-01T12:00:00.000Z');
    const insideWindowDeparture = await createDeparture({
      endAt: new Date('2035-06-04T12:00:00.000Z'),
      startAt: new Date(now.getTime() + 10 * MILLISECONDS_PER_HOUR),
    });
    const laterInsideWindowDeparture = await createDeparture({
      endAt: new Date('2035-06-05T06:00:00.000Z'),
      startAt: new Date(now.getTime() + 18 * MILLISECONDS_PER_HOUR),
    });
    const boundaryDeparture = await createDeparture({
      endAt: new Date('2035-06-05T12:00:00.000Z'),
      startAt: new Date(
        now.getTime() + BOOKING_REMINDER_LEAD_HOURS * MILLISECONDS_PER_HOUR,
      ),
    });
    const outsideWindowDeparture = await createDeparture({
      endAt: new Date('2035-06-05T12:00:00.000Z'),
      startAt: new Date(
        now.getTime() +
          (BOOKING_REMINDER_LEAD_HOURS * MILLISECONDS_PER_HOUR + 1),
      ),
    });
    const startedDeparture = await createDeparture({
      bookingDeadline: null,
      endAt: new Date('2035-06-02T12:00:00.000Z'),
      startAt: now,
    });
    const cancelledDeparture = await createDeparture({
      bookingDeadline: null,
      endAt: new Date('2035-06-03T12:00:00.000Z'),
      startAt: new Date(now.getTime() + 12 * MILLISECONDS_PER_HOUR),
      status: DepartureStatus.CANCELLED,
    });
    const reminderBookings = await Promise.all([
      createBooking({
        createdAt: new Date('2035-05-01T00:00:00.000Z'),
        departureId: insideWindowDeparture.id,
        status: BookingStatus.APPROVED,
      }),
      createBooking({
        createdAt: new Date('2035-05-01T00:00:00.000Z'),
        departureId: laterInsideWindowDeparture.id,
        status: BookingStatus.APPROVED,
      }),
      createBooking({
        createdAt: new Date('2035-05-01T00:00:00.000Z'),
        departureId: boundaryDeparture.id,
        status: BookingStatus.APPROVED,
      }),
      createBooking({
        createdAt: new Date('2035-05-01T00:00:00.000Z'),
        departureId: outsideWindowDeparture.id,
        status: BookingStatus.APPROVED,
      }),
      createBooking({
        createdAt: new Date('2035-05-01T00:00:00.000Z'),
        departureId: startedDeparture.id,
        status: BookingStatus.APPROVED,
      }),
      createBooking({
        createdAt: new Date('2035-05-01T00:00:00.000Z'),
        departureId: cancelledDeparture.id,
        status: BookingStatus.APPROVED,
      }),
    ]);

    const firstRun = await schedulerService.runDueJobs(now);
    const secondRun = await schedulerService.runDueJobs(now);
    const thirdRun = await schedulerService.runDueJobs(now);

    const expectedBookingIds = [
      reminderBookings[0].id,
      reminderBookings[1].id,
      reminderBookings[2].id,
    ].sort();
    const firstReminderPage = expectedBookingIds.slice(0, 2);
    const secondReminderPage = expectedBookingIds.slice(2);
    expect(firstRun.remindersScanned).toBe(2);
    expect(firstRun.remindersSubmitted).toBe(2);
    expect(reminderScheduleCalls).toEqual([
      ...firstReminderPage,
      ...secondReminderPage,
      ...firstReminderPage,
    ]);
    expect(remindersSubmittedToFakeQueue.size).toBe(3);
    expect(secondRun.remindersScanned).toBe(1);
    expect(thirdRun.remindersScanned).toBe(2);
    expect(notificationServiceMock.dispatchPending).toHaveBeenCalledTimes(3);
    expect(notificationServiceMock.dispatchPending).toHaveBeenLastCalledWith(
      now,
    );
  });

  async function createDeparture(input: {
    bookingDeadline?: Date | null;
    bookedSeats?: number;
    endAt: Date;
    startAt: Date;
    status?: DepartureStatus;
  }): Promise<TourDepartureEntity> {
    return departuresRepository.save(
      departuresRepository.create({
        bookingDeadline: input.bookingDeadline ?? null,
        bookedSeats: input.bookedSeats ?? 0,
        capacity: 20,
        endAt: input.endAt,
        startAt: input.startAt,
        status: input.status ?? DepartureStatus.OPEN,
        tourId,
      }),
    );
  }

  async function createBooking(input: {
    createdAt: Date;
    departureId: string;
    quantity?: number;
    status: BookingStatus;
  }): Promise<BookingEntity> {
    const bookingCode = `BT-${randomUUID().replaceAll('-', '')}`.slice(0, 30);

    return bookingsRepository.save(
      bookingsRepository.create({
        bookingCode,
        cancelReason: null,
        createdAt: input.createdAt,
        currency: 'USD',
        departureId: input.departureId,
        idempotencyKey: null,
        quantity: input.quantity ?? 1,
        status: input.status,
        totalAmount: '100.00',
        unitPrice: '100.00',
        updatedAt: input.createdAt,
        userId,
      }),
    );
  }

  function restoreEnvironmentVariable(
    name: string,
    originalValue: string | undefined,
  ): void {
    if (originalValue === undefined) {
      delete process.env[name];
      return;
    }

    process.env[name] = originalValue;
  }
});
