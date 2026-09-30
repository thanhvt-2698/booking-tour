import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { BookingStatus } from '../src/bookings/constants/booking.constants';
import { BookingEntity } from '../src/bookings/entities/booking.entity';
import { CategoryStatus } from '../src/categories/constants/category.constants';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import { ReviewStatus } from '../src/reviews/constants/review.constants';
import { ReviewEntity } from '../src/reviews/entities/review.entity';
import { DepartureStatus } from '../src/tours/constants/departure.constants';
import { TourStatus } from '../src/tours/constants/tour.constants';
import { TourDepartureEntity } from '../src/tours/entities/tour-departure.entity';
import { TourEntity } from '../src/tours/entities/tour.entity';
import { UserRole, UserStatus } from '../src/users/constants/user.constants';
import { UserEntity } from '../src/users/entities/user.entity';

describe('Tour reviews (e2e)', () => {
  let app: INestApplication<App>;
  let bookingsRepository: Repository<BookingEntity>;
  let categoriesRepository: Repository<CategoryEntity>;
  let departuresRepository: Repository<TourDepartureEntity>;
  let reviewsRepository: Repository<ReviewEntity>;
  let toursRepository: Repository<TourEntity>;
  let usersRepository: Repository<UserEntity>;
  let admin: UserEntity;
  let owner: UserEntity;
  let otherUser: UserEntity;
  let hiddenUser: UserEntity;
  let tour: TourEntity;
  let departure: TourDepartureEntity;
  let ownerBooking: BookingEntity;
  let otherBooking: BookingEntity;
  let hiddenBooking: BookingEntity;

  const tokenFor = (user: UserEntity): string =>
    app.get(JwtService).sign({ sub: user.id });

  const createBooking = async (
    user: UserEntity,
    bookingCode: string,
  ): Promise<BookingEntity> =>
    bookingsRepository.save(
      bookingsRepository.create({
        bookingCode,
        cancelReason: null,
        currency: 'VND',
        departureId: departure.id,
        idempotencyKey: null,
        quantity: 1,
        status: BookingStatus.APPROVED,
        totalAmount: '1000.00',
        unitPrice: '1000.00',
        userId: user.id,
      }),
    );

  const createReview = async (
    user: UserEntity,
    booking: BookingEntity,
    body: string,
    status = ReviewStatus.PUBLISHED,
  ): Promise<ReviewEntity> =>
    reviewsRepository.save(
      reviewsRepository.create({
        body,
        bookingId: booking.id,
        rating: 5,
        status,
        tourId: tour.id,
        userId: user.id,
      }),
    );

  beforeAll(async () => {
    if (
      !/^(?:booking_tour_f00_[a-z0-9_]+_test|booking_tour_ci_test)$/.test(
        process.env.DB_TEST_NAME ?? '',
      )
    ) {
      throw new Error(
        'E2E requires booking_tour_ci_test or a disposable booking_tour_f00_*_test database',
      );
    }
    const moduleFixture = await Test.createTestingModule({
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
    const dataSource = app.get(DataSource);
    bookingsRepository = dataSource.getRepository(BookingEntity);
    categoriesRepository = dataSource.getRepository(CategoryEntity);
    departuresRepository = dataSource.getRepository(TourDepartureEntity);
    reviewsRepository = dataSource.getRepository(ReviewEntity);
    toursRepository = dataSource.getRepository(TourEntity);
    usersRepository = dataSource.getRepository(UserEntity);
  });

  beforeEach(async () => {
    await reviewsRepository.query(
      'TRUNCATE TABLE "reviews" RESTART IDENTITY CASCADE',
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

    [admin, owner, otherUser, hiddenUser] = await usersRepository.save([
      usersRepository.create({
        email: 'reviews-admin@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
      usersRepository.create({
        email: 'reviews-owner@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
      usersRepository.create({
        email: 'reviews-other@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
      usersRepository.create({
        email: 'reviews-hidden@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    ]);
    const category = await categoriesRepository.save(
      categoriesRepository.create({
        name: 'Reviews category',
        slug: 'reviews-category',
        status: CategoryStatus.ACTIVE,
      }),
    );
    tour = await toursRepository.save(
      toursRepository.create({
        basePrice: '1000.00',
        categoryId: category.id,
        code: 'REVIEW-TOUR',
        createdBy: admin.id,
        currency: 'VND',
        description: 'Tour for review tests',
        slug: 'review-tour',
        status: TourStatus.PUBLISHED,
        title: 'Review tour',
      }),
    );
    departure = await departuresRepository.save(
      departuresRepository.create({
        bookingDeadline: null,
        bookedSeats: 3,
        capacity: 5,
        endAt: new Date('2020-01-02T00:00:00.000Z'),
        startAt: new Date('2020-01-01T00:00:00.000Z'),
        status: DepartureStatus.COMPLETED,
        tourId: tour.id,
      }),
    );
    ownerBooking = await createBooking(owner, 'REV-OWNER');
    otherBooking = await createBooking(otherUser, 'REV-OTHER');
    hiddenBooking = await createBooking(hiddenUser, 'REV-HIDDEN');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates one review for an eligible booking and rejects duplicate or invalid submissions', async () => {
    await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .send({ body: 'Great tour', rating: 5 })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ body: 'Great tour', rating: 5 })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ body: 'Great tour', rating: 6 })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ body: '  Great tour  ', rating: 5 })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          body: 'Great tour',
          rating: 5,
          status: ReviewStatus.PUBLISHED,
          tourId: tour.id,
        });
      });
    await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ body: 'Again', rating: 4 })
      .expect(409);
  });

  it('requires an approved booking whose departure has ended', async () => {
    ownerBooking.status = BookingStatus.PENDING;
    await bookingsRepository.save(ownerBooking);
    await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ body: 'Too early', rating: 5 })
      .expect(409);

    ownerBooking.status = BookingStatus.APPROVED;
    await bookingsRepository.save(ownerBooking);
    departure.startAt = new Date('2099-01-01T00:00:00.000Z');
    departure.endAt = new Date('2099-01-02T00:00:00.000Z');
    await departuresRepository.save(departure);
    await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ body: 'Still too early', rating: 5 })
      .expect(409);
  });

  it('creates only one review when duplicate submissions race', async () => {
    const submit = () =>
      request(app.getHttpServer())
        .post(`/api/tours/${tour.id}/reviews`)
        .set('Authorization', `Bearer ${tokenFor(owner)}`)
        .send({ body: 'Concurrent review', rating: 5 });

    const responses = await Promise.all([submit(), submit()]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      await reviewsRepository.countBy({ tourId: tour.id, userId: owner.id }),
    ).toBe(1);
  });

  it('lists only published reviews for a published tour with pagination', async () => {
    const first = await createReview(owner, ownerBooking, 'First');
    const second = await createReview(otherUser, otherBooking, 'Second');
    await createReview(
      hiddenUser,
      hiddenBooking,
      'Hidden',
      ReviewStatus.HIDDEN,
    );
    const sameCreatedAt = new Date('2020-02-01T00:00:00.000Z');
    await Promise.all([
      reviewsRepository.update(first.id, { createdAt: sameCreatedAt }),
      reviewsRepository.update(second.id, { createdAt: sameCreatedAt }),
    ]);
    const ordered = [first, second].sort((left, right) =>
      right.id.localeCompare(left.id),
    );

    await request(app.getHttpServer())
      .get(`/api/tours/${tour.id}/reviews?page=1&limit=1`)
      .expect(200)
      .expect(({ body }) => {
        const result = body as {
          meta: { totalItems: number; totalPages: number };
          reviews: Array<{ body: string; userId?: string }>;
        };
        expect(result.meta).toMatchObject({ totalItems: 2, totalPages: 2 });
        expect(result.reviews).toHaveLength(1);
        expect(result.reviews[0].body).toBe(ordered[0].body);
        expect(result.reviews[0].userId).toBeUndefined();
      });
    await request(app.getHttpServer())
      .get(`/api/tours/${tour.id}/reviews?page=2&limit=1`)
      .expect(200)
      .expect(({ body }) => {
        const result = body as { reviews: Array<{ body: string }> };
        expect(result.reviews[0].body).toBe(ordered[1].body);
      });

    tour.status = TourStatus.DRAFT;
    await toursRepository.save(tour);
    await request(app.getHttpServer())
      .get(`/api/tours/${tour.id}/reviews`)
      .expect(404);
  });

  it('lets only the owner edit and delete a review without undoing moderation', async () => {
    const review = await createReview(owner, ownerBooking, 'Original');
    const url = `/api/tours/${tour.id}/reviews/${review.id}`;

    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(otherUser)}`)
      .send({ rating: 4 })
      .expect(404);
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/admin/reviews/${review.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: ReviewStatus.HIDDEN })
      .expect(200);
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ body: '  Updated  ', rating: 4 })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          body: 'Updated',
          rating: 4,
          status: ReviewStatus.HIDDEN,
        });
      });
    await request(app.getHttpServer())
      .delete(url)
      .set('Authorization', `Bearer ${tokenFor(otherUser)}`)
      .expect(404);
    await request(app.getHttpServer())
      .delete(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: ReviewStatus.DELETED });
      });
    await request(app.getHttpServer())
      .delete(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ body: 'Another review', rating: 5 })
      .expect(409);
  });

  it('restricts moderation to admins and never republishes a deleted review', async () => {
    const review = await createReview(owner, ownerBooking, 'Visible');
    const url = `/api/admin/reviews/${review.id}`;

    await request(app.getHttpServer())
      .patch(url)
      .send({ status: ReviewStatus.HIDDEN })
      .expect(401);
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ status: ReviewStatus.HIDDEN })
      .expect(403);
    await request(app.getHttpServer())
      .delete(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: ReviewStatus.DELETED })
      .expect(400);
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: ReviewStatus.HIDDEN })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/tours/${tour.id}/reviews`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ reviews: [] });
      });
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: ReviewStatus.PUBLISHED })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/tours/${tour.id}/reviews`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ reviews: [{ id: review.id }] });
      });
    await request(app.getHttpServer())
      .delete(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: ReviewStatus.PUBLISHED })
      .expect(404);
  });

  it('validates review IDs, input and pagination', async () => {
    const review = await createReview(owner, ownerBooking, 'Valid');
    await request(app.getHttpServer())
      .get(`/api/tours/${tour.id}/reviews?limit=0`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/tours/invalid/reviews')
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/tours/${tour.id}/reviews/${review.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ body: '   ' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/tours/${tour.id}/reviews/${review.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ unknownField: true })
      .expect(400);
  });
});
