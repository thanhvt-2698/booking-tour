import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { BookingEventsService } from '../src/bookings/booking-events.service';
import { BookingStatus } from '../src/bookings/constants/booking.constants';
import { BookingStatusHistoryEntity } from '../src/bookings/entities/booking-status-history.entity';
import { BookingEntity } from '../src/bookings/entities/booking.entity';
import type { BookingStatusChangedEvent } from '../src/bookings/interfaces/booking-status-changed.interface';
import { CategoryStatus } from '../src/categories/constants/category.constants';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import { DepartureStatus } from '../src/tours/constants/departure.constants';
import { TourStatus } from '../src/tours/constants/tour.constants';
import { TourDepartureEntity } from '../src/tours/entities/tour-departure.entity';
import { TourEntity } from '../src/tours/entities/tour.entity';
import { UserRole, UserStatus } from '../src/users/constants/user.constants';
import { UserEntity } from '../src/users/entities/user.entity';

describe('Admin bookings (e2e)', () => {
  type AdminBookingResponseBody = {
    cancelReason: string | null;
    id: string;
    status: BookingStatus;
    user: { email: string };
  };

  let app: INestApplication<App>;
  let bookingsRepository: Repository<BookingEntity>;
  let categoriesRepository: Repository<CategoryEntity>;
  let departuresRepository: Repository<TourDepartureEntity>;
  let historiesRepository: Repository<BookingStatusHistoryEntity>;
  let toursRepository: Repository<TourEntity>;
  let usersRepository: Repository<UserEntity>;

  beforeEach(async () => {
    if (
      !/^booking_tour_f00_[a-z0-9_]+_test$/.test(process.env.DB_TEST_NAME ?? '')
    ) {
      throw new Error(
        'E2E requires a disposable booking_tour_f00_*_test database',
      );
    }
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists, approves and rejects booking requests with authorization and audit history', async () => {
    const admin = await usersRepository.save(
      usersRepository.create({
        email: 'admin-booking@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    const user = await usersRepository.save(
      usersRepository.create({
        email: 'traveler-booking@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    );
    const category = await categoriesRepository.save(
      categoriesRepository.create({
        name: 'Admin booking category',
        slug: 'admin-booking-category',
        status: CategoryStatus.ACTIVE,
      }),
    );
    const tour = await toursRepository.save(
      toursRepository.create({
        basePrice: '1500000.00',
        categoryId: category.id,
        code: 'ADMIN-BOOKING-TOUR',
        createdBy: admin.id,
        currency: 'VND',
        description: 'Tour used in admin booking test',
        slug: 'admin-booking-tour',
        status: TourStatus.PUBLISHED,
        title: 'Admin booking tour',
      }),
    );
    const departure = await departuresRepository.save(
      departuresRepository.create({
        bookedSeats: 2,
        bookingDeadline: new Date('2099-07-01T00:00:00.000Z'),
        capacity: 4,
        endAt: new Date('2099-07-05T17:00:00.000Z'),
        startAt: new Date('2099-07-02T08:00:00.000Z'),
        status: DepartureStatus.OPEN,
        tourId: tour.id,
      }),
    );
    const approvedBooking = await bookingsRepository.save(
      bookingsRepository.create({
        bookingCode: 'BT-ADMIN-APPROVE-001',
        cancelReason: null,
        currency: 'VND',
        departureId: departure.id,
        idempotencyKey: 'admin-booking-approve-001',
        quantity: 1,
        status: BookingStatus.PENDING,
        totalAmount: '1500000.00',
        unitPrice: '1500000.00',
        userId: user.id,
      }),
    );
    const rejectedBooking = await bookingsRepository.save(
      bookingsRepository.create({
        bookingCode: 'BT-ADMIN-REJECT-001',
        cancelReason: null,
        currency: 'VND',
        departureId: departure.id,
        idempotencyKey: 'admin-booking-reject-001',
        quantity: 1,
        status: BookingStatus.PENDING,
        totalAmount: '1500000.00',
        unitPrice: '1500000.00',
        userId: user.id,
      }),
    );
    const jwtService = app.get(JwtService);
    const adminToken = jwtService.sign({ sub: admin.id });
    const userToken = jwtService.sign({ sub: user.id });
    const events: BookingStatusChangedEvent[] = [];

    app
      .get(BookingEventsService)
      .onStatusChanged((event) => events.push(event));

    await request(app.getHttpServer()).get('/api/admin/bookings').expect(401);

    await request(app.getHttpServer())
      .get('/api/admin/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/admin/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: BookingStatus.PENDING, tourId: tour.id })
      .expect(200)
      .expect(({ body }) => {
        const response = body as {
          bookings: AdminBookingResponseBody[];
          meta: { totalItems: number };
        };

        expect(response.bookings).toHaveLength(2);
        expect(response.bookings[0]?.user.email).toBe(user.email);
        expect(response.meta.totalItems).toBe(2);
      });

    await request(app.getHttpServer())
      .get(`/api/admin/bookings/${approvedBooking.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect((body as AdminBookingResponseBody).id).toBe(approvedBooking.id);
      });

    await request(app.getHttpServer())
      .patch(`/api/admin/bookings/${approvedBooking.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: ' Booking request approved ' })
      .expect(200)
      .expect(({ body }) => {
        expect((body as AdminBookingResponseBody).status).toBe(
          BookingStatus.APPROVED,
        );
      });

    await request(app.getHttpServer())
      .patch(`/api/admin/bookings/${rejectedBooking.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: ' Missing required information ' })
      .expect(200)
      .expect(({ body }) => {
        const response = body as AdminBookingResponseBody;

        expect(response.cancelReason).toBe('Missing required information');
        expect(response.status).toBe(BookingStatus.REJECTED);
      });

    const savedDeparture = await departuresRepository.findOne({
      select: ['id', 'bookedSeats'],
      where: { id: departure.id },
    });
    const approvedHistory = await historiesRepository.findOne({
      select: ['bookingId', 'fromStatus', 'toStatus'],
      where: { bookingId: approvedBooking.id },
    });
    const rejectedHistory = await historiesRepository.findOne({
      select: ['bookingId', 'fromStatus', 'reason', 'toStatus'],
      where: { bookingId: rejectedBooking.id },
    });

    expect(savedDeparture?.bookedSeats).toBe(1);
    expect(approvedHistory).toMatchObject({
      fromStatus: BookingStatus.PENDING,
      toStatus: BookingStatus.APPROVED,
    });
    expect(rejectedHistory).toMatchObject({
      fromStatus: BookingStatus.PENDING,
      reason: 'Missing required information',
      toStatus: BookingStatus.REJECTED,
    });
    expect(events.map((event) => event.toStatus)).toEqual([
      BookingStatus.APPROVED,
      BookingStatus.REJECTED,
    ]);

    await request(app.getHttpServer())
      .patch(`/api/admin/bookings/${rejectedBooking.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(409);

    await request(app.getHttpServer())
      .get('/api/admin/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ createdFrom: '2030-07-31', createdTo: '2030-07-01' })
      .expect(400);
  });
});
