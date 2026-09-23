import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserEntity } from '../../users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserEntity => {
    const request = context.switchToHttp().getRequest<{ user: UserEntity }>();

    return request.user;
  },
);
