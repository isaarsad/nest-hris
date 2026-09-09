import { ForbiddenError } from '../../shared/errors/base/forbidden.error.js';

export class SelfDeactivationNotAllowedError extends ForbiddenError {
  readonly code = 'SELF_DEACTIVATION_NOT_ALLOWED';

  constructor() {
    super('You cannot deactivate your own account.');
  }
}
