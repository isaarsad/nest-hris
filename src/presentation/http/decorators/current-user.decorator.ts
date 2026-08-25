import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestingUser => {
    const request = ctx.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    return request.user;
  },
);
