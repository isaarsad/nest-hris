import { ForbiddenError } from '../../shared/errors/forbidden.error.js';

export class DepartmentPermissionDeniedError extends ForbiddenError {
  readonly code = 'DEPARTMENT_PERMISSION_DENIED';

  constructor(action: 'create' | 'update' | 'delete' | 'view') {
    super(`You do not have permission to ${action} a department`);
  }
}
