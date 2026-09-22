import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserRole, UserStatus } from '../src/users/constants/user.constants';
import { UserEntity } from '../src/users/entities/user.entity';

interface RegisterResponseBody {
  accessToken: string;
}

interface AdminUsersResponseBody {
  meta: {
    totalItems: number;
  };
  users: unknown[];
}

describe('RBAC and admin users (e2e)', () => {
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

  it('denies a normal user and permits an admin', async () => {
    await request(app.getHttpServer()).get('/api/admin/users').expect(401);
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'user@example.com',
        password: 'Password12345!',
        username: 'normal_user',
      })
      .expect(201);
    const userToken = (registerResponse.body as RegisterResponseBody)
      .accessToken;

    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const admin = await usersRepository.save(
      usersRepository.create({
        email: 'admin@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        username: 'admin',
      }),
    );
    const adminToken = app.get(JwtService).sign({
      sub: admin.id,
      username: admin.username,
    });

    const adminUsersResponse = await request(app.getHttpServer())
      .get('/api/admin/users?role=USER')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const adminUsersBody = adminUsersResponse.body as AdminUsersResponseBody;
    expect(adminUsersBody.users).toHaveLength(1);
    expect(adminUsersBody.meta.totalItems).toBe(1);
  });

  it('prevents the last admin from removing their own protection', async () => {
    const admin = await usersRepository.save(
      usersRepository.create({
        email: 'admin@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        username: 'admin',
      }),
    );
    const adminToken = app.get(JwtService).sign({
      sub: admin.id,
      username: admin.username,
    });

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${admin.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: UserRole.USER })
      .expect(403);
  });

  it('applies a role change immediately because the JWT strategy reloads the user', async () => {
    const admin = await usersRepository.save(
      usersRepository.create({
        email: 'admin@example.com',
        passwordHash: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        username: 'admin',
      }),
    );
    const target = await usersRepository.save(
      usersRepository.create({
        email: 'target@example.com',
        passwordHash: null,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        username: 'target',
      }),
    );
    const jwtService = app.get(JwtService);
    const adminToken = jwtService.sign({
      sub: admin.id,
      username: admin.username,
    });
    const targetToken = jwtService.sign({
      sub: target.id,
      username: target.username,
    });

    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${targetToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${target.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: UserRole.ADMIN })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${targetToken}`)
      .expect(200);
  });
});
