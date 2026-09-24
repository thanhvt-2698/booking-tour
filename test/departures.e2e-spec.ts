import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CategoryStatus } from '../src/categories/constants/category.constants';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import { TourStatus } from '../src/tours/constants/tour.constants';
import { TourDepartureEntity } from '../src/tours/entities/tour-departure.entity';
import { TourEntity } from '../src/tours/entities/tour.entity';
import { UserRole, UserStatus } from '../src/users/constants/user.constants';
import { UserEntity } from '../src/users/entities/user.entity';

describe('Tour departures (e2e)', () => {
  let app: INestApplication<App>;
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
    await app.init();
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
    await departuresRepository.query(
      'TRUNCATE TABLE "tour_departures", "bookings", "tours", "categories", "users" RESTART IDENTITY CASCADE',
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('lets admins manage schedules and lists only bookable schedules publicly', async () => {
    const admin = await usersRepository.save(
      usersRepository.create({
        email: 'departure-admin@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    const user = await usersRepository.save(
      usersRepository.create({
        email: 'departure-user@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    );
    const category = await categoriesRepository.save(
      categoriesRepository.create({
        name: 'Island trips',
        slug: 'island-trips',
        status: CategoryStatus.ACTIVE,
      }),
    );
    const tour = await toursRepository.save(
      toursRepository.create({
        basePrice: '1200000.00',
        categoryId: category.id,
        code: 'ISLAND-01',
        createdBy: admin.id,
        currency: 'VND',
        description: 'Island tour',
        slug: 'island-tour',
        status: TourStatus.PUBLISHED,
        title: 'Island Tour',
      }),
    );
    const jwtService = app.get(JwtService);
    const adminToken = jwtService.sign({ sub: admin.id });
    const userToken = jwtService.sign({ sub: user.id });
    const schedule = {
      bookingDeadline: '2099-06-30T23:59:00.000Z',
      capacity: 10,
      endAt: '2099-07-02T17:00:00.000Z',
      startAt: '2099-07-01T08:00:00.000Z',
    };

    const created = await request(app.getHttpServer())
      .post(`/api/admin/tours/${tour.id}/departures`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(schedule)
      .expect(201);
    const departureId = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .get(`/api/tours/${tour.id}/departures`)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          departures: Array<{ id: string; status: string }>;
        };
        expect(body.departures).toHaveLength(1);
        expect(body.departures[0]).toMatchObject({
          id: departureId,
          status: 'OPEN',
        });
      });

    await request(app.getHttpServer())
      .get(`/api/admin/tours/${tour.id}/departures`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/admin/tours/${tour.id}/departures`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(schedule)
      .expect(403);

    await departuresRepository.update({ id: departureId }, { bookedSeats: 2 });

    await request(app.getHttpServer())
      .patch(`/api/admin/departures/${departureId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ capacity: 1 })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/api/admin/departures/${departureId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ startAt: '2099-07-01T10:00:00.000Z' })
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/admin/departures/${departureId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    await departuresRepository.update({ id: departureId }, { bookedSeats: 0 });

    await request(app.getHttpServer())
      .patch(`/api/admin/departures/${departureId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLOSED' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/tours/${tour.id}/departures`)
      .expect(200)
      .expect((response) => {
        const body = response.body as { departures: unknown[] };
        expect(body.departures).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .delete(`/api/admin/departures/${departureId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('rejects schedules without an explicit timezone and invalid date order', async () => {
    const admin = await usersRepository.save(
      usersRepository.create({
        email: 'schedule-admin@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    const category = await categoriesRepository.save(
      categoriesRepository.create({
        name: 'Mountain trips',
        slug: 'mountain-trips',
        status: CategoryStatus.ACTIVE,
      }),
    );
    const tour = await toursRepository.save(
      toursRepository.create({
        basePrice: '800000.00',
        categoryId: category.id,
        code: 'MOUNTAIN-01',
        createdBy: admin.id,
        currency: 'VND',
        description: 'Mountain tour',
        slug: 'mountain-tour',
        status: TourStatus.PUBLISHED,
        title: 'Mountain Tour',
      }),
    );
    const token = app.get(JwtService).sign({ sub: admin.id });

    await request(app.getHttpServer())
      .post(`/api/admin/tours/${tour.id}/departures`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        capacity: 5,
        endAt: '2099-07-01T08:00:00',
        startAt: '2099-07-02T08:00:00',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/admin/tours/${tour.id}/departures`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        capacity: 5,
        endAt: '2099-07-01T08:00:00.000Z',
        startAt: '2099-07-02T08:00:00.000Z',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/admin/tours/${tour.id}/departures`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingDeadline: '2020-06-30T23:59:00.000Z',
        capacity: 5,
        endAt: '2099-07-02T08:00:00.000Z',
        startAt: '2099-07-01T08:00:00.000Z',
      })
      .expect(400);
  });
});
