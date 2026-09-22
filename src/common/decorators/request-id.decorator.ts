import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithId } from '../interfaces/request-with-id.interface';

export const RequestId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithId>();

    return request.requestId;
  },
);
