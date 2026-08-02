import { Injectable } from '@nestjs/common';
import {
  DepartmentFilter,
  DepartmentRepository,
} from '../../domain/departments/department.repository.js';
import { Department } from '../../domain/departments/entities/department.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { DepartmentOrmEntity } from '../database/entities/department.orm-entity.js';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { DepartmentMapper } from '../mappers/department.mapper.js';
import { DepartmentAlreadyExistsError } from '../../domain/departments/errors/department-already-exist.error.js';

@Injectable()
export class TypeOrmDepartmentRepository implements DepartmentRepository {
  constructor(
    @InjectRepository(DepartmentOrmEntity)
    private readonly departmentRepository: Repository<DepartmentOrmEntity>,
  ) {}

  async save(department: Department): Promise<Department> {
    try {
      const ormEntity = DepartmentMapper.toPersistence(department);

      const record = await this.departmentRepository.save(ormEntity);

      return DepartmentMapper.toDomain(record);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
          constraint?: string;
        };

        if (driverError.code === '23505') {
          if (driverError.constraint === 'UQ_DEPARTMENTS_NAME') {
            throw new DepartmentAlreadyExistsError('name', department.name);
          } else if (driverError.constraint === 'UQ_DEPARTMENTS_CODE') {
            throw new DepartmentAlreadyExistsError('code', department.code);
          }
        }
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Department | null> {
    const record = await this.departmentRepository.findOneBy({ id });
    return record ? DepartmentMapper.toDomain(record) : null;
  }

  async findByParentId(parentDepartmentId: string): Promise<Department[]> {
    const records = await this.departmentRepository.findBy({
      parentDepartmentId,
    });

    return records.map((record) => DepartmentMapper.toDomain(record));
  }

  async findAll(filter: DepartmentFilter): Promise<Department[]> {
    const { includeInactive = false, includeDeleted = false } = filter;

    const where: FindOptionsWhere<DepartmentOrmEntity> = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    const records = await this.departmentRepository.find({
      where,
      withDeleted: includeDeleted,
      order: {
        deletedAt: {
          direction: 'ASC',
          nulls: 'FIRST',
        },
        isActive: 'DESC',
        name: 'ASC',
      },
    });

    return records.map((record) => DepartmentMapper.toDomain(record));
  }

  async existById(id: string): Promise<boolean> {
    return await this.departmentRepository.existsBy({ id });
  }

  async existByName(name: string): Promise<boolean> {
    return await this.departmentRepository.existsBy({ name });
  }

  async existByCode(code: string): Promise<boolean> {
    return await this.departmentRepository.existsBy({ code });
  }
}
