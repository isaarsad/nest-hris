import { Department } from '../../domain/departments/entities/department.entity.js';
import { DepartmentOrmEntity } from '../database/entities/department.orm-entity.js';
import { DepartmentMapper } from './department.mapper.js';

describe('DepartmentMapper', () => {
  const now = new Date('2024-01-01T00:00:00.000Z');
  const updated = new Date('2024-06-01T00:00:00.000Z');
  const deleted = new Date('2024-12-01T00:00:00.000Z');

  const buildOrmEntity = (
    overrides: Partial<DepartmentOrmEntity> = {},
  ): DepartmentOrmEntity => {
    const orm = new DepartmentOrmEntity();
    orm.id = 'dept-001';
    orm.name = 'Engineering';
    orm.code = 'ENG';
    orm.parentDepartmentId = 'dept-000';
    orm.headEmployeeId = 'emp-001';
    orm.isActive = true;
    orm.createdAt = now;
    orm.updatedAt = updated;
    orm.deletedAt = null;
    return Object.assign(orm, overrides);
  };

  const buildDomainEntity = (overrides: Partial<Department> = {}): Department =>
    new Department({
      id: 'dept-001',
      name: 'Engineering',
      code: 'ENG',
      parentDepartmentId: 'dept-000',
      headEmployeeId: 'emp-001',
      isActive: true,
      createdAt: now,
      updatedAt: updated,
      deletedAt: null,
      ...overrides,
    });

  // ===================================================================
  // toDomain
  // ===================================================================

  describe('toDomain', () => {
    it('should map all fields from ORM entity to domain entity', () => {
      const orm = buildOrmEntity();
      const domain = DepartmentMapper.toDomain(orm);

      expect(domain).toBeInstanceOf(Department);
      expect(domain.id).toBe(orm.id);
      expect(domain.name).toBe(orm.name);
      expect(domain.code).toBe(orm.code);
      expect(domain.parentDepartmentId).toBe(orm.parentDepartmentId);
      expect(domain.headEmployeeId).toBe(orm.headEmployeeId);
      expect(domain.isActive).toBe(orm.isActive);
      expect(domain.createdAt).toEqual(orm.createdAt);
      expect(domain.updatedAt).toEqual(orm.updatedAt);
      expect(domain.deletedAt).toBeNull();
    });

    it('should map nullable fields (parentDepartmentId, headEmployeeId, deletedAt) as null', () => {
      const orm = buildOrmEntity({
        parentDepartmentId: null,
        headEmployeeId: null,
        deletedAt: null,
      });

      const domain = DepartmentMapper.toDomain(orm);

      expect(domain.parentDepartmentId).toBeNull();
      expect(domain.headEmployeeId).toBeNull();
      expect(domain.deletedAt).toBeNull();
    });

    it('should map a soft-deleted ORM entity with a non-null deletedAt', () => {
      const orm = buildOrmEntity({ deletedAt: deleted });
      const domain = DepartmentMapper.toDomain(orm);

      expect(domain.deletedAt).toEqual(deleted);
    });

    it('should map isActive as false', () => {
      const orm = buildOrmEntity({ isActive: false });
      const domain = DepartmentMapper.toDomain(orm);

      expect(domain.isActive).toBe(false);
    });

    it('should return a new Department instance on every call (no shared reference)', () => {
      const orm = buildOrmEntity();
      const domain1 = DepartmentMapper.toDomain(orm);
      const domain2 = DepartmentMapper.toDomain(orm);

      expect(domain1).not.toBe(domain2);
    });
  });

  // ===================================================================
  // toPersistence
  // ===================================================================

  describe('toPersistence', () => {
    it('should map all fields from domain entity to ORM entity', () => {
      const domain = buildDomainEntity();
      const orm = DepartmentMapper.toPersistence(domain);

      expect(orm).toBeInstanceOf(DepartmentOrmEntity);
      expect(orm.id).toBe(domain.id);
      expect(orm.name).toBe(domain.name);
      expect(orm.code).toBe(domain.code);
      expect(orm.parentDepartmentId).toBe(domain.parentDepartmentId);
      expect(orm.headEmployeeId).toBe(domain.headEmployeeId);
      expect(orm.isActive).toBe(domain.isActive);
      expect(orm.createdAt).toEqual(domain.createdAt);
      expect(orm.updatedAt).toEqual(domain.updatedAt);
      expect(orm.deletedAt).toBeNull();
    });

    it('should map nullable fields (parentDepartmentId, headEmployeeId, deletedAt) as null', () => {
      const domain = buildDomainEntity({
        parentDepartmentId: null,
        headEmployeeId: null,
        deletedAt: null,
      });
      const orm = DepartmentMapper.toPersistence(domain);

      expect(orm.parentDepartmentId).toBeNull();
      expect(orm.headEmployeeId).toBeNull();
      expect(orm.deletedAt).toBeNull();
    });

    it('should map a soft-deleted domain entity with a non-null deletedAt', () => {
      const domain = buildDomainEntity({ deletedAt: deleted });
      const orm = DepartmentMapper.toPersistence(domain);

      expect(orm.deletedAt).toEqual(deleted);
    });

    it('should map isActive as false', () => {
      const domain = buildDomainEntity({ isActive: false });
      const orm = DepartmentMapper.toPersistence(domain);

      expect(orm.isActive).toBe(false);
    });

    it('should return a new DepartmentOrmEntity instance on every call (no shared reference)', () => {
      const domain = buildDomainEntity();
      const orm1 = DepartmentMapper.toPersistence(domain);
      const orm2 = DepartmentMapper.toPersistence(domain);

      expect(orm1).not.toBe(orm2);
    });
  });

  // ===================================================================
  // round-trip
  // ===================================================================

  describe('round-trip (toDomain → toPersistence)', () => {
    it('should preserve all fields after toDomain then toPersistence', () => {
      const originalOrm = buildOrmEntity();
      const domain = DepartmentMapper.toDomain(originalOrm);
      const roundTrippedOrm = DepartmentMapper.toPersistence(domain);

      expect(roundTrippedOrm.id).toBe(originalOrm.id);
      expect(roundTrippedOrm.name).toBe(originalOrm.name);
      expect(roundTrippedOrm.code).toBe(originalOrm.code);
      expect(roundTrippedOrm.parentDepartmentId).toBe(
        originalOrm.parentDepartmentId,
      );
      expect(roundTrippedOrm.headEmployeeId).toBe(originalOrm.headEmployeeId);
      expect(roundTrippedOrm.isActive).toBe(originalOrm.isActive);
      expect(roundTrippedOrm.createdAt).toEqual(originalOrm.createdAt);
      expect(roundTrippedOrm.updatedAt).toEqual(originalOrm.updatedAt);
      expect(roundTrippedOrm.deletedAt).toBeNull();
    });

    it('should preserve all fields after toPersistence then toDomain', () => {
      const originalDomain = buildDomainEntity();
      const orm = DepartmentMapper.toPersistence(originalDomain);
      const roundTrippedDomain = DepartmentMapper.toDomain(orm);

      expect(roundTrippedDomain.id).toBe(originalDomain.id);
      expect(roundTrippedDomain.name).toBe(originalDomain.name);
      expect(roundTrippedDomain.code).toBe(originalDomain.code);
      expect(roundTrippedDomain.parentDepartmentId).toBe(
        originalDomain.parentDepartmentId,
      );
      expect(roundTrippedDomain.headEmployeeId).toBe(
        originalDomain.headEmployeeId,
      );
      expect(roundTrippedDomain.isActive).toBe(originalDomain.isActive);
      expect(roundTrippedDomain.createdAt).toEqual(originalDomain.createdAt);
      expect(roundTrippedDomain.updatedAt).toEqual(originalDomain.updatedAt);
      expect(roundTrippedDomain.deletedAt).toBeNull();
    });
  });
});
