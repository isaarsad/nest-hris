import { Department } from '../../domain/departments/entities/department.entity.js';
import { DepartmentRepository } from '../../domain/departments/department.repository.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { UserPermission } from '../../domain/users/user-role-permissions.js';

export class GetDepartmentsUseCase {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async execute(requestingUser: RequestingUser): Promise<Department[]> {
    const includeInactive = requestingUser.hasPermission(
      UserPermission.VIEW_INACTIVE_DEPARTMENTS,
    );
    const includeDeleted = requestingUser.hasPermission(
      UserPermission.VIEW_DELETED_DEPARTMENTS,
    );

    const departments = await this.departmentRepository.findAll({
      includeInactive,
      includeDeleted,
    });

    return departments;
  }
}
