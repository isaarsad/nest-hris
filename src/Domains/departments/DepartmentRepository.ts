import { Department } from './entities/Department.js';

export interface DepartmentRepository {
  save(department: Department): Promise<Department>;

  findById(id: string): Promise<Department | null>;

  findByParentId(parentDepartmentId: string): Promise<Department[]>;

  findAll(): Promise<Department[]>;

  existById(id: string): Promise<boolean>;

  existByName(name: string): Promise<boolean>;

  existByCode(code: string): Promise<boolean>;
}
