import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain Layer (Abstract Class / Interface Repository)
import { DepartmentRepository } from '../../../domain/departments/department.repository.js';
import { IdGeneratorPort } from '../../../domain/shared/ports/id-generator.port.js';

// Application Layer (Use Cases)
import { CreateDepartmentUseCase } from '../../../application/departments/create-department.use-case.js';
import { GetDepartmentsUseCase } from '../../../application/departments/get-departments.use-case.js';

// Infrastructure Layer (TypeORM Entity & Repository Implementation)
import { DepartmentOrmEntity } from '../../../infrastructure/database/entities/department.orm-entity.js';
import { TypeOrmDepartmentRepository } from '../../../infrastructure/repositories/typeorm-department.repository.js';

// Presentation Layer (Controller)
import { DepartmentsController } from './departments.controller.js';
import { UuidGenerator } from '../../../infrastructure/utils/uuid-generator.js';

export const DEPARTMENT_REPOSITORY = Symbol('DEPARTMENT_REPOSITORY');
export const ID_GENERATOR = Symbol('ID_GENERATOR');

@Module({
  imports: [TypeOrmModule.forFeature([DepartmentOrmEntity])],
  controllers: [DepartmentsController],
  providers: [
    {
      provide: DEPARTMENT_REPOSITORY,
      useClass: TypeOrmDepartmentRepository,
    },
    {
      provide: ID_GENERATOR,
      useClass: UuidGenerator,
    },
    {
      provide: CreateDepartmentUseCase,
      inject: [DEPARTMENT_REPOSITORY, ID_GENERATOR],
      useFactory: (
        departmentRepo: DepartmentRepository,
        idGenerator: IdGeneratorPort,
      ) => {
        return new CreateDepartmentUseCase(departmentRepo, idGenerator);
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
