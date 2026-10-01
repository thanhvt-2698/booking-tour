import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { MAX_PAGE_SIZE } from '../src/common/constants/app.constants';
import { ReviewStatus } from '../src/reviews/constants/review.constants';

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
  it('documents tour image uploads on create and update', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    for (const operation of [
      document.paths['/api/admin/tours']?.post,
      document.paths['/api/admin/tours/{tourId}']?.patch,
    ]) {
      expect(operation?.requestBody).toMatchObject({
        content: {
          'application/json': expect.any(Object) as unknown,
          'multipart/form-data': expect.any(Object) as unknown,
        },
      });
    }
    expect(document.components?.schemas?.CreateTourWithImagesDto).toMatchObject(
      {
        properties: {
          images: {
            type: 'array',
            maxItems: 10,
            items: { type: 'string', format: 'binary' },
          },
        },
      },
    );
  });
  it('documents avatar uploads on registration and profile update', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    for (const operation of [
      document.paths['/api/auth/register']?.post,
      document.paths['/api/users/me']?.patch,
    ]) {
      expect(operation?.requestBody).toMatchObject({
        content: {
          'application/json': expect.any(Object) as unknown,
          'multipart/form-data': expect.any(Object) as unknown,
        },
      });
    }
  });
  it('documents review uploads and visibility-controlled downloads', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    for (const operation of [
      document.paths['/api/tours/{tourId}/reviews']?.post,
      document.paths['/api/tours/{tourId}/reviews/{reviewId}']?.patch,
    ]) {
      expect(operation?.requestBody).toMatchObject({
        content: {
          'application/json': expect.any(Object) as unknown,
          'multipart/form-data': expect.any(Object) as unknown,
        },
      });
    }
    expect(document.paths['/api/review-images/{filename}']?.get).toBeDefined();
  });

  it('documents the ADMIN review moderation list contract', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .addBearerAuth(
          { bearerFormat: 'JWT', scheme: 'bearer', type: 'http' },
          'access-token',
        )
        .build(),
    );
    const operation = document.paths['/api/admin/reviews']?.get;
    const adminReviewSchema = document.components?.schemas
      ?.AdminReviewResponseDto as SchemaObject | undefined;
    const reviewSchema = document.components?.schemas?.ReviewResponseDto as
      SchemaObject | undefined;
    const reviewImageSchema = document.components?.schemas
      ?.ReviewImageResponseDto as SchemaObject | undefined;

    expect(operation).toBeDefined();
    expect(operation?.tags).toContain('Administration');
    expect(operation?.security).toEqual([{ 'access-token': [] }]);
    expect(operation?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'query',
          name: 'page',
          required: false,
          schema: expect.objectContaining({ type: 'number' }) as unknown,
        }),
        expect.objectContaining({
          in: 'query',
          name: 'limit',
          required: false,
          schema: expect.objectContaining({
            type: 'number',
            maximum: MAX_PAGE_SIZE,
          }) as unknown,
        }),
        expect.objectContaining({
          in: 'query',
          name: 'status',
          required: false,
          schema: expect.objectContaining({
            enum: Object.values(ReviewStatus),
          }) as unknown,
        }),
        expect.objectContaining({
          in: 'query',
          name: 'tourId',
          required: false,
          schema: expect.objectContaining({ format: 'uuid' }) as unknown,
        }),
        expect.objectContaining({
          in: 'query',
          name: 'userId',
          required: false,
          schema: expect.objectContaining({ format: 'uuid' }) as unknown,
        }),
      ]),
    );
    expect(operation?.responses).toMatchObject({
      '200': {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AdminReviewListResponseDto' },
          },
        },
      },
      '400': expect.any(Object) as unknown,
      '401': expect.any(Object) as unknown,
      '403': expect.any(Object) as unknown,
    });
    expect(adminReviewSchema?.properties).toMatchObject({
      userId: expect.any(Object) as unknown,
    });
    expect(reviewSchema?.properties?.status).toMatchObject({
      enum: Object.values(ReviewStatus),
    });
    expect(reviewSchema?.properties).not.toHaveProperty('bookingId');
    expect(reviewImageSchema?.properties).toMatchObject({
      id: expect.any(Object) as unknown,
      mimeType: expect.any(Object) as unknown,
      originalName: expect.any(Object) as unknown,
      sizeBytes: expect.any(Object) as unknown,
      sortOrder: expect.any(Object) as unknown,
      url: expect.any(Object) as unknown,
    });
    expect(reviewImageSchema?.properties).not.toHaveProperty('storageKey');
  });
});
