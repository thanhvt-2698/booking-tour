import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { BookingStatus } from '../src/bookings/constants/booking.constants';
import { BookingEntity } from '../src/bookings/entities/booking.entity';
import { CategoryStatus } from '../src/categories/constants/category.constants';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import { DepartureStatus } from '../src/tours/constants/departure.constants';
import { TourStatus } from '../src/tours/constants/tour.constants';
import { TourDepartureEntity } from '../src/tours/entities/tour-departure.entity';
import { TourEntity } from '../src/tours/entities/tour.entity';
import { UserRole, UserStatus } from '../src/users/constants/user.constants';
import { UserEntity } from '../src/users/entities/user.entity';

describe('Bookings (e2e)', () => {
  interface BookingResponseBody {
    cancelReason?: string | null;
    id: string;
    status: BookingStatus;
    totalAmount: string;
  }

  let app: INestApplication<App>;
  let bookingsRepository: Repository<BookingEntity>;
  let categoriesRepository: Repository<CategoryEntity>;
  let departuresRepository: Repository<TourDepartureEntity>;
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

  it('creates, queries, and cancels an idempotent booking without overbooking', async () => {
    const user = await usersRepository.save(
      usersRepository.create({
        email: 'booking-user@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    );
    const otherUser = await usersRepository.save(
      usersRepository.create({
        email: 'other-booking-user@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    );
    const category = await categoriesRepository.save(
      categoriesRepository.create({
        name: 'Booking category',
        slug: 'booking-category',
        status: CategoryStatus.ACTIVE,
      }),
    );
    const tour = await toursRepository.save(
      toursRepository.create({
        basePrice: '1500000.00',
        categoryId: category.id,
        code: 'BOOKING-TOUR',
        createdBy: user.id,
        currency: 'VND',
        description: 'Tour used in booking test',
        slug: 'booking-tour',
        status: TourStatus.PUBLISHED,
        title: 'Booking tour',
      }),
    );
    const departure = await departuresRepository.save(
      departuresRepository.create({
        bookingDeadline: new Date('2099-07-01T00:00:00.000Z'),
        capacity: 3,
        endAt: new Date('2099-07-05T17:00:00.000Z'),
        startAt: new Date('2099-07-02T08:00:00.000Z'),
        status: DepartureStatus.OPEN,
        tourId: tour.id,
      }),
    );
    const jwtService = app.get(JwtService);
    const userToken = jwtService.sign({ sub: user.id });
    const otherUserToken = jwtService.sign({ sub: otherUser.id });
    const createRequest = { departureId: departure.id, quantity: 1 };

    await request(app.getHttpServer())
      .post('/api/bookings')
      .send(createRequest)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send(createRequest)
      .expect(400);

    const createResponse = await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', 'booking-request-001')
      .send(createRequest)
      .expect(201);
    const booking = createResponse.body as BookingResponseBody;

    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(booking.totalAmount).toBe('1500000.00');

    await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', 'booking-request-001')
      .send(createRequest)
      .expect(201)
      .expect(({ body }) => {
        expect((body as BookingResponseBody).id).toBe(booking.id);
      });

    await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', 'booking-request-001')
      .send({ departureId: departure.id, quantity: 2 })
      .expect(409);

    await request(app.getHttpServer())
      .get('/api/bookings/me')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ status: BookingStatus.PENDING })
      .expect(200)
      .expect(({ body }) => {
        const response = body as {
          bookings: BookingResponseBody[];
          meta: { totalItems: number };
        };
        expect(response.meta.totalItems).toBe(1);
        expect(response.bookings[0]?.id).toBe(booking.id);
      });

    await request(app.getHttpServer())
      .get(`/api/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(404);

    const parallelResponses = await Promise.all([
      request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', 'booking-request-002')
        .send({ departureId: departure.id, quantity: 2 }),
      request(app.getHttpServer())
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', 'booking-request-003')
        .send({ departureId: departure.id, quantity: 2 }),
    ]);

    expect(parallelResponses.map((response) => response.status).sort()).toEqual(
      [201, 409],
    );
    const savedDepartureBeforeCancellation = await departuresRepository.findOne(
      {
        select: ['id', 'bookedSeats'],
        where: { id: departure.id },
      },
    );
    expect(savedDepartureBeforeCancellation?.bookedSeats).toBe(
      departure.capacity,
    );

    await request(app.getHttpServer())
      .patch(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: ' Cannot join this departure ' })
      .expect(200)
      .expect(({ body }) => {
        const response = body as BookingResponseBody;

        expect(response.cancelReason).toBe('Cannot join this departure');
        expect(response.status).toBe(BookingStatus.CANCELLED);
      });

    const savedDepartureAfterCancellation = await departuresRepository.findOne({
      select: ['id', 'bookedSeats'],
      where: { id: departure.id },
    });
    expect(savedDepartureAfterCancellation?.bookedSeats).toBe(
      departure.capacity - createRequest.quantity,
    );

    await request(app.getHttpServer())
      .patch(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
      .expect(200)
      .expect(({ body }) => {
        expect((body as BookingResponseBody).status).toBe(
          BookingStatus.CANCELLED,
        );
      });

    const savedDepartureAfterCancellationRetry =
      await departuresRepository.findOne({
        select: ['id', 'bookedSeats'],
        where: { id: departure.id },
      });
    expect(savedDepartureAfterCancellationRetry?.bookedSeats).toBe(
      departure.capacity - createRequest.quantity,
    );

    await request(app.getHttpServer())
      .patch(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({})
      .expect(404);
  });
});
