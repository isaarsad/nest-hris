import { ForbiddenError } from '../../shared/errors/base/forbidden.error.js';

export class SelfRoleChangeNotAllowedError extends ForbiddenError {
  readonly code = 'SELF_ROLE_CHANGE_NOT_ALLOWED';

  constructor() {
    super('Changing your own role is not allowed');
  }
}
