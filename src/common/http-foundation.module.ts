import {
  BadRequestException,
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import type { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import type { RequestWithId } from './interfaces/request-with-id.interface';

export function validationDetails(
  errors: ValidationError[],
  prefix = '',
): Array<{ field: string; rule: string }> {
  return errors.flatMap((error) => {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    return [
      ...Object.keys(error.constraints ?? {}).map((rule) => ({ field, rule })),
      ...validationDetails(error.children ?? [], field),
    ];
  });
}

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: { 'vi-*': 'vi', 'en-*': 'en' },
      loaderOptions: { path: join(__dirname, '../i18n/'), watch: false },
      resolvers: [AcceptLanguageResolver],
    }),
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
          validationError: { target: false, value: false },
          exceptionFactory: (errors) =>
            new BadRequestException({
              message: 'errors.validation',
              details: validationDetails(errors),
            }),
        }),
    },
  ],
})
export class HttpFoundationModule implements NestModule {
  private readonly logger = new Logger('HTTP');

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((req: RequestWithId, res: Response, next: NextFunction) => {
        const startedAt = Date.now();
        const value = req.headers['x-request-id'];
        req.requestId =
          typeof value === 'string' && /^[\w-]{1,128}$/.test(value)
            ? value
            : randomUUID();
        res.setHeader('x-request-id', req.requestId);
        res.on('finish', () => {
          this.logger.log(
            JSON.stringify({
              requestId: req.requestId,
              method: req.method,
              statusCode: res.statusCode,
              durationMs: Date.now() - startedAt,
            }),
          );
        });
        next();
      })
      .forRoutes('*');
  }
}
