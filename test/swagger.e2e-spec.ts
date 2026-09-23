import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Swagger auth and RBAC contract', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents auth endpoints, bearer security, and ADMIN user management', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .addBearerAuth(
          { bearerFormat: 'JWT', scheme: 'bearer', type: 'http' },
          'access-token',
        )
        .build(),
    );

    expect(
      document.components?.securitySchemes?.['access-token'],
    ).toMatchObject({
      scheme: 'bearer',
      type: 'http',
    });
    expect(document.paths['/api/auth/register']?.post?.tags).toContain(
      'Authentication',
    );
    expect(document.paths['/api/users/me']?.get?.security).toEqual([
      { 'access-token': [] },
    ]);
    expect(
      document.paths['/api/admin/users/{userId}/role']?.patch?.tags,
    ).toContain('Administration');
  });
});
