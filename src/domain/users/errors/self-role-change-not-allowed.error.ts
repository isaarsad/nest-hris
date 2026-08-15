import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class SelfRoleChangeNotAllowedError extends InvariantError {
  readonly code = 'SELF_ROLE_CHANGE_NOT_ALLOWED';

  constructor() {
    super('Changing your own role is not allowed');
  }
}
