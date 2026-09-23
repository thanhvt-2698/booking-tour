import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CategoryEntity } from '../src/categories/entities/category.entity';
import { UserRole, UserStatus } from '../src/users/constants/user.constants';
import { UserEntity } from '../src/users/entities/user.entity';

describe('Categories (e2e)', () => {
  interface CreateCategoryResponseBody {
    id: string;
    slug: string;
  }

  let app: INestApplication<App>;
  let categoriesRepository: Repository<CategoryEntity>;
  let usersRepository: Repository<UserEntity>;

  beforeEach(async () => {
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
    usersRepository = app.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
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

  it('allows an admin to create/archive a category and hides it publicly', async () => {
    const admin = await usersRepository.save(
      usersRepository.create({
        email: 'admin@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    const token = app.get(JwtService).sign({ sub: admin.id });

    const createResponse = await request(app.getHttpServer())
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Du lịch biển' })
      .expect(201);
    const responseBody = createResponse.body as CreateCategoryResponseBody;
    const categoryId = responseBody.id;
    expect(responseBody.slug).toBe('du-lich-bien');

    await request(app.getHttpServer())
      .get('/api/categories')
      .expect(200)
      .expect((response) => {
        const body = response.body as { categories: unknown[] };
        expect(body.categories).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/admin/categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/categories')
      .expect(200)
      .expect((response) => {
        const body = response.body as { categories: unknown[] };
        expect(body.categories).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}`)
      .expect(404);
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
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should be rejected' })
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/categories/not-a-uuid')
      .expect(400);
  });
});
