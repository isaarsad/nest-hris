import { Department } from '../../domain/departments/entities/department.entity.js';
import { DepartmentRepository } from '../../domain/departments/department.repository.js';
import {
  DepartmentAlreadyExistsError,
  DepartmentNotFoundError,
  DepartmentPermissionDeniedError,
} from '../../domain/departments/errors/index.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { UserPermission } from '../../domain/users/user-role-permissions.js';

export interface CreateDepartmentInput {
  name: string;
  code: string;
  parentDepartmentId?: string | null;
  headEmployeeId?: string | null;
}

export class CreateDepartmentUseCase {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly idGenerator: () => string,
  ) {}

  async execute(
    requestingUser: RequestingUser,
    input: CreateDepartmentInput,
  ): Promise<Department> {
    const canCreate = requestingUser.hasPermission(
      UserPermission.CREATE_DEPARTMENT,
    );
    if (!canCreate) {
      throw new DepartmentPermissionDeniedError('create');
    }

    const { name, code, parentDepartmentId, headEmployeeId } = input;

    const [isNameUsed, isCodeUsed] = await Promise.all([
      this.departmentRepository.existByName(name),
      this.departmentRepository.existByCode(code),
    ]);

    if (isNameUsed) {
      throw new DepartmentAlreadyExistsError('name', name);
    }

    if (isCodeUsed) {
      throw new DepartmentAlreadyExistsError('code', code);
    }

    if (parentDepartmentId) {
      const parentExists =
        await this.departmentRepository.findById(parentDepartmentId);
      if (!parentExists) {
        throw new DepartmentNotFoundError(parentDepartmentId);
      }
    }

    const department = Department.create({
      id: this.idGenerator(),
      name: name,
      code: code,
      parentDepartmentId: parentDepartmentId,
      headEmployeeId: headEmployeeId,
    });

    return this.departmentRepository.save(department);
  }
}
