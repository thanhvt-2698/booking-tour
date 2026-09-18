import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CategoryStatus } from '../src/categories/constants/category.constants';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import { TourStatus } from '../src/tours/constants/tour.constants';
import { TourEntity } from '../src/tours/entities/tour.entity';
import { UserRole, UserStatus } from '../src/users/constants/user.constants';
import { UserEntity } from '../src/users/entities/user.entity';

describe('Tours (e2e)', () => {
  interface TourResponseBody {
    id: string;
    slug: string;
    status: TourStatus;
  }

  let app: INestApplication<App>;
  let categoriesRepository: Repository<CategoryEntity>;
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
    categoriesRepository = app.get<Repository<CategoryEntity>>(
      getRepositoryToken(CategoryEntity),
    );
    toursRepository = app.get<Repository<TourEntity>>(
      getRepositoryToken(TourEntity),
    );
    usersRepository = app.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
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
    if (app) {
      await app.close();
    }
  });

  it('keeps draft tours private and exposes published tours publicly', async () => {
    const admin = await usersRepository.save(
      usersRepository.create({
        email: 'admin@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    const category = await categoriesRepository.save(
      categoriesRepository.create({
        name: 'Du lịch biển',
        slug: 'du-lich-bien',
        status: CategoryStatus.ACTIVE,
      }),
    );
    const token = app.get(JwtService).sign({
      sub: admin.id,
    });

    const createResponse = await request(app.getHttpServer())
      .post('/api/admin/tours')
      .set('Authorization', `Bearer ${token}`)
      .send({
        basePrice: 1500000,
        categoryId: category.id,
        code: 'hn-dn-001',
        description: 'Khám phá biển miền Trung',
        title: 'Tour Đà Nẵng',
      })
      .expect(201);
    const responseBody = createResponse.body as TourResponseBody;
    const tourId = responseBody.id;

    expect(responseBody.slug).toBe('tour-da-nang');
    expect(responseBody.status).toBe(TourStatus.DRAFT);

    await request(app.getHttpServer())
      .get('/api/tours')
      .expect(200)
      .expect((response) => {
        const body = response.body as { tours: unknown[] };
        expect(body.tours).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .patch(`/api/admin/tours/${tourId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: TourStatus.PUBLISHED })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/tours/${tourId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: tourId,
          status: TourStatus.PUBLISHED,
        });
      });

    await request(app.getHttpServer())
      .get('/api/admin/tours')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/tours?keyword=Đà%20Nẵng')
      .expect(200)
      .expect((response) => {
        const body = response.body as { tours: TourResponseBody[] };
        expect(body.tours).toHaveLength(1);
        expect(body.tours[0]?.id).toBe(tourId);
      });

    await request(app.getHttpServer())
      .delete(`/api/admin/tours/${tourId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer()).get(`/api/tours/${tourId}`).expect(404);
  });

  it('rejects non-admin management requests and invalid public IDs', async () => {
    const user = await usersRepository.save(
      usersRepository.create({
        email: 'user@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      }),
    );
    const token = app.get(JwtService).sign({ sub: user.id });

    await request(app.getHttpServer())
      .post('/api/admin/tours')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(403);

    await request(app.getHttpServer()).get('/api/tours/not-a-uuid').expect(400);
  });
});
