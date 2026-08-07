import { ConflictError } from '../../shared/errors/base/conflict.error.js';

export class DepartmentAlreadyExistsError extends ConflictError {
  readonly code = 'DEPARTMENT_ALREADY_EXISTS';

  constructor(field: 'code' | 'name', value: string) {
    super(`Department with ${field} '${value}' already exists`);
  }
}
