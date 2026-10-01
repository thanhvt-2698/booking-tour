import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { BookingStatus } from '../src/bookings/constants/booking.constants';
import { BookingEntity } from '../src/bookings/entities/booking.entity';
import { MAX_PAGE_SIZE } from '../src/common/constants/app.constants';
import { CategoryStatus } from '../src/categories/constants/category.constants';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import { ReviewStatus } from '../src/reviews/constants/review.constants';
import { ReviewEntity } from '../src/reviews/entities/review.entity';
import { ReviewImageEntity } from '../src/reviews/entities/review-image.entity';
import type { AdminReviewList } from '../src/reviews/interfaces/admin-review-list.interface';
import { FileStorageService } from '../src/files/file-storage.service';
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
  let reviewImagesRepository: Repository<ReviewImageEntity>;
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

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5x8AAAAASUVORK5CYII=',
    'base64',
  );

  const tokenFor = (user: UserEntity): string =>
    app.get(JwtService).sign({ sub: user.id });

  const createBooking = async (
    user: UserEntity,
    bookingCode: string,
    departureId = departure.id,
  ): Promise<BookingEntity> =>
    bookingsRepository.save(
      bookingsRepository.create({
        bookingCode,
        cancelReason: null,
        currency: 'VND',
        departureId,
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
    reviewTour: TourEntity = tour,
  ): Promise<ReviewEntity> =>
    reviewsRepository.save(
      reviewsRepository.create({
        body,
        bookingId: booking.id,
        rating: 5,
        status,
        tourId: reviewTour.id,
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
    reviewImagesRepository = dataSource.getRepository(ReviewImageEntity);
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

  afterEach(async () => {
    if (!reviewImagesRepository) return;
    const images = await reviewImagesRepository.find({
      select: ['storageKey'],
    });
    await app
      .get(FileStorageService)
      .removeBestEffort(images.map((image) => image.storageKey));
  });

  it('creates a review with three images in one multipart request and serves only visible review images', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .field('body', '  Review with photos  ')
      .field('rating', '5')
      .attach('images', png, 'first.png')
      .attach('images', png, 'second.png')
      .attach('images', png, 'third.png')
      .expect(201);
    const review = response.body as {
      id: string;
      body: string;
      images: Array<{ id: string; url: string; storageKey?: string }>;
    };
    expect(review.body).toBe('Review with photos');
    expect(review.images).toHaveLength(3);
    expect(review.images[0].storageKey).toBeUndefined();
    expect(await reviewImagesRepository.countBy({ reviewId: review.id })).toBe(
      3,
    );
    const imageUrl = review.images[0].url;
    const download = await request(app.getHttpServer())
      .get(imageUrl)
      .expect('Content-Type', /image\/png/)
      .expect('Cache-Control', 'no-store')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect(200);
    expect(download.body).toEqual(png);

    await request(app.getHttpServer())
      .patch(`/api/admin/reviews/${review.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: ReviewStatus.HIDDEN })
      .expect(200);
    await request(app.getHttpServer()).get(imageUrl).expect(404);
    await request(app.getHttpServer())
      .patch(`/api/admin/reviews/${review.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: ReviewStatus.PUBLISHED })
      .expect(200);
    await toursRepository.update(tour.id, { status: TourStatus.DRAFT });
    await request(app.getHttpServer()).get(imageUrl).expect(404);
    await toursRepository.update(tour.id, { status: TourStatus.PUBLISHED });
    await request(app.getHttpServer())
      .delete(`/api/tours/${tour.id}/reviews/${review.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .expect(200);
    await request(app.getHttpServer()).get(imageUrl).expect(404);
    expect(await reviewImagesRepository.countBy({ reviewId: review.id })).toBe(
      0,
    );
    await request(app.getHttpServer())
      .get('/api/review-images/not-a-valid-file.png')
      .expect(400);
  });

  it('validates image content, upload limits and authentication without creating a review', async () => {
    const url = `/api/tours/${tour.id}/reviews`;
    await request(app.getHttpServer())
      .post(url)
      .field('body', 'Unauthorized')
      .field('rating', '5')
      .attach('images', png, 'photo.png')
      .expect(401);
    await request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .field('body', 'Invalid image')
      .field('rating', '5')
      .attach('images', Buffer.from('plain text'), {
        filename: 'spoofed.png',
        contentType: 'image/png',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .field('body', 'Too many photos')
      .field('rating', '5')
      .attach('images', png, 'one.png')
      .attach('images', png, 'two.png')
      .attach('images', png, 'three.png')
      .attach('images', png, 'four.png')
      .expect(400);
    expect(await reviewsRepository.count()).toBe(0);
    expect(await reviewImagesRepository.count()).toBe(0);
  });

  it('updates text and replaces selected photos atomically while preserving other photos', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/tours/${tour.id}/reviews`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .field('body', 'Original with images')
      .field('rating', '5')
      .attach('images', png, 'one.png')
      .attach('images', png, 'two.png')
      .attach('images', png, 'three.png')
      .expect(201);
    const review = created.body as {
      id: string;
      images: Array<{ id: string; url: string }>;
    };
    const url = `/api/tours/${tour.id}/reviews/${review.id}`;
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(otherUser)}`)
      .attach('images', png, 'unauthorized.png')
      .expect(404);
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .field('body', 'Should not be saved')
      .attach('images', png, 'four.png')
      .expect(400);
    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .field('removeImageIds', '["invalid-id"]')
      .expect(400);
    const persisted = await reviewsRepository.findOne({
      select: ['body'],
      where: { id: review.id },
    });
    expect(persisted?.body).toBe('Original with images');

    const updated = await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .field('body', '  Updated with replacement  ')
      .field('rating', '4')
      .field('removeImageIds', JSON.stringify([review.images[0].id]))
      .attach('images', png, 'replacement.png')
      .expect(200);
    const result = updated.body as {
      body: string;
      rating: number;
      images: Array<{ id: string; originalName: string }>;
    };
    expect(result).toMatchObject({
      body: 'Updated with replacement',
      rating: 4,
    });
    expect(result.images).toHaveLength(3);
    expect(result.images.map((image) => image.id)).toEqual(
      expect.arrayContaining([review.images[1].id, review.images[2].id]),
    );
    expect(
      result.images.find((image) => image.id === review.images[0].id),
    ).toBeUndefined();
    expect(
      result.images.some((image) => image.originalName === 'replacement.png'),
    ).toBe(true);
    await request(app.getHttpServer()).get(review.images[0].url).expect(404);

    await request(app.getHttpServer())
      .patch(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ removeImageIds: result.images.map((image) => image.id) })
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ images: [] }));
    expect(await reviewImagesRepository.countBy({ reviewId: review.id })).toBe(
      0,
    );
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

  it('lists admin reviews with filters, stable pagination, public fields and all statuses', async () => {
    const publishedReview = await createReview(
      owner,
      ownerBooking,
      'Published review',
      ReviewStatus.PUBLISHED,
    );
    const hiddenReview = await createReview(
      otherUser,
      otherBooking,
      'Hidden review',
      ReviewStatus.HIDDEN,
    );
    const deletedReview = await createReview(
      hiddenUser,
      hiddenBooking,
      'Deleted review',
      ReviewStatus.DELETED,
    );
    const otherTour = await toursRepository.save(
      toursRepository.create({
        basePrice: '1200.00',
        categoryId: tour.categoryId,
        code: 'REVIEW-OTHER-TOUR',
        createdBy: admin.id,
        currency: 'VND',
        description: 'Second tour for admin review filters',
        slug: 'review-other-tour',
        status: TourStatus.PUBLISHED,
        title: 'Other review tour',
      }),
    );
    const otherDeparture = await departuresRepository.save(
      departuresRepository.create({
        bookingDeadline: null,
        bookedSeats: 1,
        capacity: 2,
        endAt: new Date('2020-02-02T00:00:00.000Z'),
        startAt: new Date('2020-02-01T00:00:00.000Z'),
        status: DepartureStatus.COMPLETED,
        tourId: otherTour.id,
      }),
    );
    const otherTourBooking = await createBooking(
      otherUser,
      'REV-OTHER-TOUR',
      otherDeparture.id,
    );
    const otherTourReview = await createReview(
      otherUser,
      otherTourBooking,
      'Hidden review on another tour',
      ReviewStatus.HIDDEN,
      otherTour,
    );
    const sameCreatedAt = new Date('2025-05-06T07:08:09.000Z');
    const reviews = [
      publishedReview,
      hiddenReview,
      deletedReview,
      otherTourReview,
    ];
    await Promise.all(
      reviews.map((review) =>
        reviewsRepository.update(review.id, { createdAt: sameCreatedAt }),
      ),
    );
    const expectedPageOrder = [...reviews].sort((left, right) =>
      right.id.localeCompare(left.id),
    );
    const imageFileName = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png';
    const publicImageUrl = `/${process.env.API_PREFIX ?? 'api'}/review-images/${imageFileName}`;
    await reviewImagesRepository.save(
      reviewImagesRepository.create({
        mimeType: 'image/png',
        originalName: 'review-photo.png',
        reviewId: publishedReview.id,
        sizeBytes: 123,
        sortOrder: 0,
        storageKey: `reviews/${imageFileName}`,
        url: publicImageUrl,
      }),
    );
    await reviewImagesRepository.save(
      reviewImagesRepository.create({
        mimeType: 'image/png',
        originalName: 'hidden-review-photo.png',
        reviewId: hiddenReview.id,
        sizeBytes: 456,
        sortOrder: 0,
        storageKey: 'reviews/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png',
        url: `/${process.env.API_PREFIX ?? 'api'}/review-images/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png`,
      }),
    );
    await reviewImagesRepository.save(
      reviewImagesRepository.create({
        mimeType: 'image/png',
        originalName: 'deleted-review-photo.png',
        reviewId: deletedReview.id,
        sizeBytes: 789,
        sortOrder: 0,
        storageKey: 'reviews/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png',
        url: `/${process.env.API_PREFIX ?? 'api'}/review-images/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png`,
      }),
    );

    const url = `/${process.env.API_PREFIX ?? 'api'}/admin/reviews`;
    await request(app.getHttpServer()).get(url).expect(401);
    await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .expect(403);

    const firstPage = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .query({ page: 1, limit: 2 })
      .expect(200);
    const firstPageBody = firstPage.body as AdminReviewList;
    expect(firstPageBody.meta).toMatchObject({
      currentPage: 1,
      pageSize: 2,
      totalItems: 4,
      totalPages: 2,
    });
    expect(firstPageBody.reviews.map((review) => review.id)).toEqual(
      expectedPageOrder.slice(0, 2).map((review) => review.id),
    );

    const secondPage = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .query({ page: 2, limit: 2 })
      .expect(200);
    const secondPageBody = secondPage.body as AdminReviewList;
    expect(secondPageBody.reviews.map((review) => review.id)).toEqual(
      expectedPageOrder.slice(2).map((review) => review.id),
    );

    const defaultStatuses = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .expect(200);
    const defaultStatusesBody = defaultStatuses.body as AdminReviewList;
    expect(defaultStatusesBody.meta.totalItems).toBe(4);
    expect(defaultStatusesBody.reviews.map((review) => review.status)).toEqual(
      expect.arrayContaining([
        ReviewStatus.PUBLISHED,
        ReviewStatus.HIDDEN,
        ReviewStatus.DELETED,
      ]),
    );
    const publishedOnly = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .query({ status: ReviewStatus.PUBLISHED })
      .expect(200);
    const publishedOnlyBody = publishedOnly.body as AdminReviewList;
    expect(publishedOnlyBody.meta.totalItems).toBe(1);
    expect(
      publishedOnlyBody.reviews.every(
        (review) => review.status === ReviewStatus.PUBLISHED,
      ),
    ).toBe(true);

    const hiddenOnly = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .query({ status: ReviewStatus.HIDDEN })
      .expect(200);
    const hiddenOnlyBody = hiddenOnly.body as AdminReviewList;
    expect(hiddenOnlyBody.meta.totalItems).toBe(2);
    expect(
      hiddenOnlyBody.reviews.every(
        (review) => review.status === ReviewStatus.HIDDEN,
      ),
    ).toBe(true);

    const deletedOnly = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .query({ status: ReviewStatus.DELETED })
      .expect(200);
    const deletedOnlyBody = deletedOnly.body as AdminReviewList;
    expect(deletedOnlyBody.reviews).toHaveLength(1);
    expect(deletedOnlyBody.reviews[0].id).toBe(deletedReview.id);
    expect(deletedOnlyBody.reviews[0].images).toEqual([]);

    const filtered = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .query({
        status: ReviewStatus.HIDDEN,
        tourId: tour.id,
        userId: otherUser.id,
      })
      .expect(200);
    const filteredBody = filtered.body as AdminReviewList;
    expect(filteredBody.meta.totalItems).toBe(1);
    expect(filteredBody.reviews[0].id).toBe(hiddenReview.id);
    expect(filteredBody.reviews[0].images).toHaveLength(1);
    expect(filteredBody.reviews[0].images[0]).toMatchObject({
      mimeType: 'image/png',
      originalName: 'hidden-review-photo.png',
      sizeBytes: 456,
      sortOrder: 0,
    });
    expect(filteredBody.reviews[0].images[0]).not.toHaveProperty('storageKey');

    const empty = await request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .query({ userId: admin.id })
      .expect(200);
    const emptyBody = empty.body as AdminReviewList;
    expect(emptyBody).toMatchObject({
      meta: { totalItems: 0, totalPages: 0 },
      reviews: [],
    });

    const returnedReview = defaultStatusesBody.reviews.find(
      (review) => review.id === publishedReview.id,
    );
    expect(returnedReview).toBeDefined();
    if (returnedReview === undefined) {
      return;
    }
    expect(returnedReview.userId).toBe(owner.id);
    expect(returnedReview).not.toHaveProperty('bookingId');
    expect(returnedReview).not.toHaveProperty('email');
    expect(returnedReview).not.toHaveProperty('user');
    expect(Object.keys(returnedReview).sort()).toEqual(
      [
        'body',
        'createdAt',
        'id',
        'images',
        'rating',
        'status',
        'tourId',
        'updatedAt',
        'userId',
      ].sort(),
    );
    expect(returnedReview.images).toEqual([
      {
        id: expect.any(String) as unknown,
        mimeType: 'image/png',
        originalName: 'review-photo.png',
        sizeBytes: 123,
        sortOrder: 0,
        url: publicImageUrl,
      },
    ]);
    expect(returnedReview.images[0]).not.toHaveProperty('storageKey');
    expect(Object.keys(returnedReview.images[0] ?? {}).sort()).toEqual(
      [
        'id',
        'mimeType',
        'originalName',
        'sizeBytes',
        'sortOrder',
        'url',
      ].sort(),
    );

    const invalidQueries = [
      { status: 'INVALID' },
      { tourId: 'not-a-uuid' },
      { userId: 'not-a-uuid' },
      { page: 0 },
      { limit: 0 },
      { limit: MAX_PAGE_SIZE + 1 },
      { unexpectedFilter: 'value' },
    ];
    for (const query of invalidQueries) {
      await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .query(query)
        .expect(400);
    }
  });
});
