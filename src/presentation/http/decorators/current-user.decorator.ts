import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';
import { UserRole } from '../../../domain/users/user-role-permissions.js';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestingUser => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();

    const idFromHeader =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (request.headers['x-user-id'] as string) || 'dev-user-id';
    const roleFromHeader =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (request.headers['x-user-role'] as UserRole) || UserRole.ADMIN;

    return new RequestingUser(idFromHeader, roleFromHeader);
  },
);
