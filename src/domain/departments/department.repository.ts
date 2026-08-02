import { Department } from './entities/department.entity.js';

export interface DepartmentFilter {
  includeInactive?: boolean;
  includeDeleted?: boolean;
}

export interface DepartmentRepository {
  save(department: Department): Promise<Department>;

  findById(id: string): Promise<Department | null>;

  findByParentId(parentDepartmentId: string): Promise<Department[]>;

  findAll(filter: DepartmentFilter): Promise<Department[]>;

  existById(id: string): Promise<boolean>;

  existByName(name: string): Promise<boolean>;

  existByCode(code: string): Promise<boolean>;
}
