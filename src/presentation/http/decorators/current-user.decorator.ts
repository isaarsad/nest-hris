import { createParamDecorator } from '@nestjs/common';
import { RequestingUser } from '../../../domain/users/entities/requesting-user.entity.js';
import { UserRole } from '../../../domain/users/user-role-permissions.js';

export const CurrentUser = createParamDecorator((): RequestingUser => {
  return new RequestingUser('dev-user-id', UserRole.ADMIN);
});
