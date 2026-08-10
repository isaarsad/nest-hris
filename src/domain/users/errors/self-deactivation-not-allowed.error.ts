import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class SelfDeactivationNotAllowedError extends InvariantError {
  readonly code = 'SELF_DEACTIVATION_NOT_ALLOWED';

  constructor() {
    super('You cannot deactivate your own account.');
  }
}
