import { Department } from '../../domain/departments/entities/department.entity.js';
import { DepartmentOrmEntity } from '../database/entities/department.orm-entity.js';

export class DepartmentMapper {
  static toDomain(orm: DepartmentOrmEntity): Department {
    return new Department({
      id: orm.id,
      name: orm.name,
      code: orm.code,
      parentDepartmentId: orm.parentDepartmentId,
      headEmployeeId: orm.headEmployeeId,
      isActive: orm.isActive,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      deletedAt: orm.deletedAt,
    });
  }

  static toPersistence(domain: Department): DepartmentOrmEntity {
    const orm = new DepartmentOrmEntity();
    orm.id = domain.id;
    orm.name = domain.name;
    orm.code = domain.code;
    orm.parentDepartmentId = domain.parentDepartmentId;
    orm.headEmployeeId = domain.headEmployeeId;
    orm.isActive = domain.isActive;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    orm.deletedAt = domain.deletedAt;

    return orm;
  }
}
