import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';

// Domain Layer (Abstract Class / Interface Repository)
import { DepartmentRepository } from '../../../domain/departments/department.repository.js';

// Application Layer (Use Cases)
import { CreateDepartmentUseCase } from '../../../application/departments/create-department.use-case.js';
import { GetDepartmentsUseCase } from '../../../application/departments/get-departments.use-case.js';

// Infrastructure Layer (TypeORM Entity & Repository Implementation)
import { DepartmentOrmEntity } from '../../../infrastructure/database/entities/department.orm-entity.js';
import { TypeOrmDepartmentRepository } from '../../../infrastructure/repositories/typeorm-department.repository.js';

// Presentation Layer (Controller)
import { DepartmentsController } from './departments.controller.js';

export const DEPARTMENT_REPOSITORY = Symbol('DEPARTMENT_REPOSITORY');

@Module({
  imports: [TypeOrmModule.forFeature([DepartmentOrmEntity])],
  controllers: [DepartmentsController],
  providers: [
    {
      provide: DEPARTMENT_REPOSITORY,
      useClass: TypeOrmDepartmentRepository,
    },
    {
      provide: CreateDepartmentUseCase,
      inject: [DEPARTMENT_REPOSITORY],
      useFactory: (departmentRepo: DepartmentRepository) => {
        return new CreateDepartmentUseCase(departmentRepo, () => randomUUID());
      },
    },
    {
      provide: GetDepartmentsUseCase,
      inject: [DEPARTMENT_REPOSITORY],
      useFactory: (departmentRepo: DepartmentRepository) => {
        return new GetDepartmentsUseCase(departmentRepo);
      },
    },
  ],
  exports: [CreateDepartmentUseCase, GetDepartmentsUseCase],
})
export class DepartmentsModule {}
