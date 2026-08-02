import { NotFoundError } from '../../shared/errors/not-found.error.js';

export class DepartmentNotFoundError extends NotFoundError {
  readonly code = 'DEPARTMENT_NOT_FOUND';

  constructor(id: string) {
    super(`Department with id '${id}' not found`);
  }
}
