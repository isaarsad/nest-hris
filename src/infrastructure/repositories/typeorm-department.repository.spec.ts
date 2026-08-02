import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../database/data-source.js';
import { DepartmentOrmEntity } from '../database/entities/department.orm-entity.js';
import { TypeOrmDepartmentRepository } from './typeorm-department.repository.js';
import { DepartmentTableTestHelper } from '../../../test/helpers/department-table-test.helper.js';
import { Department } from '../../domain/departments/entities/department.entity.js';
import { DepartmentAlreadyExistsError } from '../../domain/departments/errors/department-already-exist.error.js';
import { randomUUID } from 'crypto';

describe('TypeOrmDepartmentRepository', () => {
  let module: TestingModule;
  let repository: TypeOrmDepartmentRepository;
  let dataSource: DataSource;
  let helper: DepartmentTableTestHelper;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...dataSourceOptions,
          migrations: [],
        }),
        TypeOrmModule.forFeature([DepartmentOrmEntity]),
      ],
      providers: [TypeOrmDepartmentRepository],
    }).compile();

    repository = module.get(TypeOrmDepartmentRepository);
    dataSource = module.get(DataSource);
    helper = new DepartmentTableTestHelper(dataSource);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await helper.clear();
  });

  // ─── save ────────────────────────────────────────────────────────────────────

  describe('save()', () => {
    it('should persist and return a new department', async () => {
      const dept = Department.create({
        id: randomUUID(),
        name: 'Engineering',
        code: 'ENG',
        parentDepartmentId: null,
        headEmployeeId: null,
      });

      const result = await repository.save(dept);

      expect(result).toStrictEqual(
        new Department({
          id: dept.id,
          name: 'Engineering',
          code: 'ENG',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          deletedAt: null,
        }),
      );

      const raw = await helper.findByIdRaw(dept.id);
      expect(raw).toStrictEqual({
        id: dept.id,
        name: 'Engineering',
        code: 'ENG',
        isActive: true,
        parentDepartmentId: null,
        headEmployeeId: null,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        deletedAt: null,
      });
    });

    it('should update an existing department when saved again', async () => {
      const inserted = await helper.insert({
        name: 'Human Resources',
        code: 'HRM',
      });

      // Re-save with the same id but different code
      const dept = new Department({
        id: inserted.id,
        name: 'Human Resources',
        code: 'HRX',
        parentDepartmentId: null,
        headEmployeeId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await repository.save(dept);

      expect(result).toStrictEqual(
        new Department({
          id: dept.id,
          name: 'Human Resources',
          code: 'HRX',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          deletedAt: null,
        }),
      );

      const raw = await helper.findByIdRaw(inserted.id);
      expect(raw).toStrictEqual({
        id: dept.id,
        name: 'Human Resources',
        code: 'HRX',
        isActive: true,
        parentDepartmentId: null,
        headEmployeeId: null,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        deletedAt: null,
      });
    });

    it('should throw DepartmentAlreadyExistsError when name is duplicated', async () => {
      await helper.insert({ name: 'Finance', code: 'FIN' });

      const dept = Department.create({
        id: randomUUID(),
        name: 'Finance',
        code: 'FIN2',
      });

      await expect(repository.save(dept)).rejects.toThrow(
        DepartmentAlreadyExistsError,
      );

      const inDb = await helper.findByIdRaw(dept.id);
      expect(inDb).toBeNull();
    });

    it('should throw DepartmentAlreadyExistsError when code is duplicated', async () => {
      await helper.insert({ name: 'Marketing', code: 'MKT' });

      const dept = Department.create({
        id: randomUUID(),
        name: 'Marketing 2',
        code: 'MKT',
      });

      await expect(repository.save(dept)).rejects.toThrow(
        DepartmentAlreadyExistsError,
      );

      const inDb = await helper.findByIdRaw(dept.id);
      expect(inDb).toBeNull();
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the department when found', async () => {
      const dept = await helper.insert({
        name: 'Engineering',
        code: 'ENG',
      });

      const result = await repository.findById(dept.id);

      expect(result).toStrictEqual(
        new Department({
          id: dept.id,
          name: 'Engineering',
          code: 'ENG',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: result!.createdAt,
          updatedAt: result!.updatedAt,
          deletedAt: null,
        }),
      );
    });

    it('should return null when department is not found', async () => {
      const result = await repository.findById(randomUUID());
      expect(result).toBeNull();
    });
  });

  // ─── findByParentId ──────────────────────────────────────────────────────────

  describe('findByParentId()', () => {
    it('should return children departments of a given parent', async () => {
      const parent = await helper.insert({
        id: randomUUID(),
        name: 'Operations',
        code: 'OPS',
      });
      await helper.insert({
        id: randomUUID(),
        name: 'Ops Sub 1',
        code: 'OS1',
        parentDepartmentId: parent.id,
      });
      await helper.insert({
        id: randomUUID(),
        name: 'Ops Sub 2',
        code: 'OS2',
        parentDepartmentId: parent.id,
      });
      // unrelated dept
      await helper.insert({ name: 'Legal', code: 'LGL' });

      const results = await repository.findByParentId(parent.id);

      expect(results).toHaveLength(2);
      expect(results).toStrictEqual([
        new Department({
          id: results[0]!.id,
          name: 'Ops Sub 1',
          code: 'OS1',
          parentDepartmentId: parent.id,
          isActive: true,
          headEmployeeId: null,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
        new Department({
          id: results[1]!.id,
          name: 'Ops Sub 2',
          code: 'OS2',
          parentDepartmentId: parent.id,
          isActive: true,
          headEmployeeId: null,
          createdAt: results[1]!.createdAt,
          updatedAt: results[1]!.updatedAt,
          deletedAt: null,
        }),
      ]);
    });

    it('should return an empty array when no children exist', async () => {
      const parent = await helper.insert({ name: 'Solo', code: 'SLO' });
      const results = await repository.findByParentId(parent.id);
      expect(results).toEqual([]);
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return only active departments by default', async () => {
      await helper.insert({
        id: randomUUID(),
        name: 'Active Dept',
        code: 'ACT',
        isActive: true,
      });
      await helper.insert({
        id: randomUUID(),
        name: 'Inactive Dept',
        code: 'INA',
        isActive: false,
      });

      const results = await repository.findAll({});

      expect(results).toHaveLength(1);
      expect(results).toStrictEqual([
        new Department({
          id: results[0]!.id,
          name: 'Active Dept',
          code: 'ACT',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
      ]);
    });

    it('should include inactive departments when includeInactive is true', async () => {
      await helper.insert({
        id: randomUUID(),
        name: 'Active',
        code: 'ACT',
        isActive: true,
      });
      await helper.insert({
        id: randomUUID(),
        name: 'Inactive',
        code: 'INA',
        isActive: false,
      });

      const results = await repository.findAll({ includeInactive: true });

      expect(results).toHaveLength(2);
      expect(results).toStrictEqual([
        new Department({
          id: results[0]!.id,
          name: 'Active',
          code: 'ACT',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
        new Department({
          id: results[1]!.id,
          name: 'Inactive',
          code: 'INA',
          isActive: false,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: results[1]!.createdAt,
          updatedAt: results[1]!.updatedAt,
          deletedAt: null,
        }),
      ]);
    });

    it('should not include soft-deleted departments by default', async () => {
      await helper.insert({ name: 'Alive', code: 'ALV' });
      await helper.insert({
        name: 'Deleted',
        code: 'DEL',
        deletedAt: new Date(),
      });

      const results = await repository.findAll({ includeInactive: true });

      expect(results).toHaveLength(1);
      expect(results).toStrictEqual([
        new Department({
          id: results[0]!.id,
          name: 'Alive',
          code: 'ALV',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
      ]);
    });

    it('should include soft-deleted departments when includeDeleted is true', async () => {
      await helper.insert({ name: 'Alive', code: 'ALV' });
      await helper.insert({
        name: 'Deleted',
        code: 'DEL',
        deletedAt: new Date(),
      });

      const results = await repository.findAll({
        includeInactive: true,
        includeDeleted: true,
      });

      expect(results).toHaveLength(2);
      expect(results).toStrictEqual([
        new Department({
          id: results[0]!.id,
          name: 'Alive',
          code: 'ALV',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
        new Department({
          id: results[1]!.id,
          name: 'Deleted',
          code: 'DEL',
          isActive: true,
          parentDepartmentId: null,
          headEmployeeId: null,
          createdAt: results[1]!.createdAt,
          updatedAt: results[1]!.updatedAt,
          deletedAt: results[1]!.deletedAt,
        }),
      ]);
    });

    it('should return an empty array when the table is empty', async () => {
      const results = await repository.findAll({});
      expect(results).toHaveLength(0);
    });
  });

  // ─── existById ───────────────────────────────────────────────────────────────

  describe('existById()', () => {
    it('should return true when the department exists', async () => {
      const dept = await helper.insert({ name: 'Exist Test', code: 'EXT' });
      const result = await repository.existById(dept.id);
      expect(result).toBe(true);
    });

    it('should return false when the department does not exist', async () => {
      const result = await repository.existById(randomUUID());
      expect(result).toBe(false);
    });
  });

  // ─── existByName ─────────────────────────────────────────────────────────────

  describe('existByName()', () => {
    it('should return true when the name exists', async () => {
      await helper.insert({ name: 'Unique Name', code: 'UNM' });
      const result = await repository.existByName('Unique Name');
      expect(result).toBe(true);
    });

    it('should return false when the name does not exist', async () => {
      const result = await repository.existByName('Ghost Department');
      expect(result).toBe(false);
    });

    it('should be case-insensitive and match regardless of casing', async () => {
      await helper.insert({ name: 'Engineering' });

      const result = await repository.existByName('engineering');

      expect(result).toBe(true);
    });
  });

  // ─── existByCode ─────────────────────────────────────────────────────────────

  describe('existByCode()', () => {
    it('should return true when the code exists', async () => {
      await helper.insert({ name: 'Code Dept', code: 'CDX' });
      const result = await repository.existByCode('CDX');
      expect(result).toBe(true);
    });

    it('should return false when the code does not exist', async () => {
      const result = await repository.existByCode('ZZZ');
      expect(result).toBe(false);
    });
  });
});
