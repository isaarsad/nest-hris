import { ForbiddenError } from '../../shared/errors/base/forbidden.error.js';

export class UserInactiveError extends ForbiddenError {
  readonly code = 'USER_INACTIVE';

  constructor() {
    super('User is inactive. Please contact your HR administrator.');
  }
}
