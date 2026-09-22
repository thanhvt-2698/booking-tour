import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserEntity } from '../src/users/entities/user.entity';
import { UserStatus } from '../src/users/constants/user.constants';

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  user: {
    email: string;
    username: string;
  };
}

describe('Authentication and current user (e2e)', () => {
  let app: INestApplication<App>;
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

    usersRepository = app.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
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

  it('registers, authenticates, updates profile and rotates refresh token', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'jake@example.com',
        password: 'Password12345!',
        username: 'jake',
      })
      .expect(201);

    const registered = registerResponse.body as AuthResponseBody;
    expect(registered.user).toMatchObject({
      email: 'jake@example.com',
      username: 'jake',
    });
    expect(registered.accessToken).toEqual(expect.any(String));
    expect(registered.refreshToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          email: 'jake@example.com',
          username: 'jake',
        });
      });

    const updateResponse = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .send({ bio: 'Backend developer', username: 'new_jake' })
      .expect(200);
    expect(updateResponse.body).toMatchObject({
      bio: 'Backend developer',
      username: 'new_jake',
    });

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: registered.refreshToken })
      .expect(200);
    const refreshed = refreshResponse.body as AuthResponseBody;
    expect(refreshed.refreshToken).not.toBe(registered.refreshToken);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: registered.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshed.refreshToken })
      .expect(401);
  });

  it('rejects invalid credentials and blocks unauthenticated profile access', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'jake@example.com',
        password: 'Password12345!',
        username: 'jake',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'jake@example.com', password: 'WrongPassword123!' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'jake@example.com', password: 'Password12345!' })
      .expect(200);
  });

  it('rejects duplicate registration and unexpected fields with localized errors', async () => {
    const payload = {
      email: 'unique@example.com',
      password: 'Password12345!',
      username: 'unique',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(payload)
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Accept-Language', 'vi')
      .send(payload)
      .expect(409);
    expect(duplicate.body).toMatchObject({
      code: 'errors.userConflict',
      message: 'Email hoặc tên đăng nhập đã được sử dụng',
    });
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...payload, role: 'ADMIN' })
      .expect(400);
  });

  it('allows only one concurrent refresh and revokes logout tokens', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'rotate@example.com',
        username: 'rotate',
        password: 'Password12345!',
      })
      .expect(201);
    const pair = registration.body as AuthResponseBody;
    expect(JSON.stringify(pair.user)).not.toContain('password');
    const results = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({ refreshToken: pair.refreshToken }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    const success = results.find((r) => r.status === 200)!;
    const refreshed = success.body as AuthResponseBody;
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: refreshed.refreshToken })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshed.refreshToken })
      .expect(401);
  });

  it('denies blocked accounts even with an existing access token', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'blocked@example.com',
        username: 'blocked',
        password: 'Password12345!',
      })
      .expect(201);
    const pair = registration.body as AuthResponseBody;
    await usersRepository.update(
      { email: 'blocked@example.com' },
      { status: UserStatus.BLOCKED },
    );
    const denied = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${pair.accessToken}`)
      .set('Accept-Language', 'vi')
      .expect(401);
    expect(denied.headers['x-request-id']).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'blocked@example.com', password: 'Password12345!' })
      .expect(401);
  });
});
