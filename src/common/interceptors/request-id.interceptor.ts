import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { REQUEST_ID_HEADER } from '../constants/app.constants';
import type { RequestWithId } from '../interfaces/request-with-id.interface';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithId>();
    const response = httpContext.getResponse<Response>();
    const requestId = this.getRequestId(request.headers[REQUEST_ID_HEADER]);

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle();
  }

  private getRequestId(headerValue: string | string[] | undefined): string {
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue;
    }

    return randomUUID();
  }
}
