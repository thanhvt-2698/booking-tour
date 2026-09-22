import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import type { RequestWithId } from '../interfaces/request-with-id.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;
    const supplied =
      typeof payload === 'string'
        ? payload
        : payload && 'message' in payload
          ? payload.message
          : null;
    const defaultKey = this.defaultKey(status);
    const code =
      typeof supplied === 'string' && /^errors\.[a-zA-Z]+$/.test(supplied)
        ? supplied
        : defaultKey;
    const lang = I18nContext.current(host)?.lang ?? 'en';
    let message: string | string[] = this.translate(code, lang, defaultKey);
    if (
      payload &&
      typeof payload === 'object' &&
      'details' in payload &&
      Array.isArray(payload.details)
    ) {
      message = payload.details.map((detail: { field: string; rule: string }) =>
        this.translate('errors.validationField', lang, defaultKey, {
          field: detail.field,
        }),
      );
    }
    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      code,
      message,
      path: request.path,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private translate(
    key: string,
    lang: string,
    fallback: string,
    args?: Record<string, string>,
  ): string {
    const message = this.i18n.translate<string, string>(key, { lang, args });
    return message === key
      ? this.i18n.translate<string, string>(fallback, { lang, args })
      : message;
  }

  private defaultKey(status: number): string {
    return (
      (
        {
          400: 'errors.badRequest',
          401: 'errors.unauthorized',
          403: 'errors.forbidden',
          404: 'errors.notFound',
          409: 'errors.conflict',
          429: 'errors.rateLimit',
        } as Record<number, string>
      )[status] ?? 'errors.internal'
    );
  }
}
