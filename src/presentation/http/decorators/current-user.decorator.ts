import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestingUser => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return request.user!;
  },
);
