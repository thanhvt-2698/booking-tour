import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsEmail } from 'class-validator';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HttpFoundationModule } from '../src/common/http-foundation.module';

class Input {
  @IsEmail() email!: string;
}

@Controller('probe')
class ProbeController {
  @Get() fail(): void {
    throw new UnauthorizedException('errors.unauthorized');
  }
  @Get('missing') missing(): void {
    throw new UnauthorizedException('errors.missingKey');
  }
  @Get('internal') internal(): void {
    throw new Error('sensitive-database-detail');
  }
  @Post() validate(@Body() input: Input): Input {
    return input;
  }
}

@Module({ imports: [HttpFoundationModule], controllers: [ProbeController] })
class ProbeModule {}

describe('HTTP i18n contract (no database)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('isolates locales for concurrent requests and falls back to English', async () => {
    const responses = await Promise.all(
      ['vi-VN', 'en', 'fr'].map((lang) =>
        request(app.getHttpServer())
          .get('/probe')
          .set('Accept-Language', lang)
          .expect(401),
      ),
    );
    expect(responses[0].body).toMatchObject({
      code: 'errors.unauthorized',
      message: 'Yêu cầu đăng nhập',
    });
    expect(responses[1].body).toMatchObject({
      code: 'errors.unauthorized',
      message: 'Authentication required',
    });
    expect(responses[2].body).toMatchObject({
      message: 'Authentication required',
    });
    expect(responses[0].headers['x-request-id']).toEqual(expect.any(String));
  });

  it('translates validation with field interpolation and rejects unknown fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/probe')
      .set('Accept-Language', 'vi')
      .send({ email: 'invalid', role: 'ADMIN' })
      .expect(400);
    expect(res.body).toMatchObject({
      code: 'errors.validation',
      message: expect.arrayContaining([
        'Trường không hợp lệ hoặc không được phép: email',
        'Trường không hợp lệ hoặc không được phép: role',
      ]) as unknown,
    });
  });

  it('uses safe fallback for missing keys and never exposes internal errors', async () => {
    const missing = await request(app.getHttpServer())
      .get('/probe/missing')
      .set('Accept-Language', 'vi')
      .expect(401);
    expect(missing.body).toMatchObject({ message: 'Yêu cầu đăng nhập' });
    const internal = await request(app.getHttpServer())
      .get('/probe/internal')
      .expect(500);
    expect(internal.body).toMatchObject({ message: 'Internal server error' });
    expect(JSON.stringify(internal.body)).not.toContain(
      'sensitive-database-detail',
    );
  });
});
