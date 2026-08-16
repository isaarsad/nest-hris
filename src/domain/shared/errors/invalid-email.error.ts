import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class InvalidEmailError extends InvariantError {
  readonly code = 'INVALID_EMAIL';

  constructor(value: string) {
    super(`Invalid email: ${value}`);
  }
}
