import { InvariantError } from '../../shared/errors/base/invariant.error.js';

export class DepartmentCircularParentError extends InvariantError {
  readonly code = 'DEPARTMENT_CIRCULAR_PARENT';

  constructor(name: string) {
    super(`Department '${name}' cannot be its own parent`);
  }
}
