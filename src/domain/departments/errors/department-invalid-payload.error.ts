import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class DepartmentInvalidPayloadError extends InvariantError {
  readonly code = 'DEPARTMENT_INVALID_PAYLOAD';

  constructor() {
    super('Department must have id, name, and code');
  }
}
