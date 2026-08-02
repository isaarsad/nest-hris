import { Department } from '../../../../domain/departments/entities/department.entity.js';

export interface DepartmentResponseDto {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  headEmployeeId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class DepartmentPresenter {
  static toResponse(entity: Department): DepartmentResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      parentDepartmentId: entity.parentDepartmentId,
      headEmployeeId: entity.headEmployeeId,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
