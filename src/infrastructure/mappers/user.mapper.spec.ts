import { User, UserProps } from '../../domain/users/entities/user.entity.js';
import {
  Email,
  PasswordHash,
  Username,
} from '../../domain/shared/value-objects/index.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import { UserOrmEntity } from '../database/entities/user.orm-entity.js';
import { UserMapper } from './user.mapper.js';

describe('UserMapper', () => {
  const now = new Date('2024-01-01T00:00:00.000Z');
  const updated = new Date('2024-06-01T00:00:00.000Z');
  const deleted = new Date('2024-12-01T00:00:00.000Z');

  const buildOrmEntity = (
    overrides: Partial<UserOrmEntity> = {},
  ): UserOrmEntity => {
    const orm = new UserOrmEntity();
    orm.id = 'user-001';
    orm.username = 'johndoe';
    orm.email = 'john@example.com';
    orm.passwordHash = '$2b$10$hashedpassword';
    orm.role = UserRole.EMPLOYEE;
    orm.isActive = true;
    orm.createdAt = now;
    orm.updatedAt = updated;
    orm.deletedAt = null;
    return Object.assign(orm, overrides);
  };

  const buildDomainEntity = (overrides: Partial<UserProps> = {}): User =>
    new User({
      id: 'user-001',
      username: new Username('johndoe'),
      email: new Email('john@example.com'),
      passwordHash: new PasswordHash('$2b$10$hashedpassword'),
      role: UserRole.EMPLOYEE,
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
      const domain = UserMapper.toDomain(orm);

      expect(domain).toBeInstanceOf(User);
      expect(domain.id).toBe(orm.id);
      expect(domain.username.value).toBe(orm.username);
      expect(domain.email.value).toBe(orm.email);
      expect(domain.passwordHash.value).toBe(orm.passwordHash);
      expect(domain.role).toBe(orm.role);
      expect(domain.isActive).toBe(orm.isActive);
      expect(domain.createdAt).toEqual(orm.createdAt);
      expect(domain.updatedAt).toEqual(orm.updatedAt);
      expect(domain.deletedAt).toBeNull();
    });

    it('should map deletedAt as null when ORM entity is not soft-deleted', () => {
      const orm = buildOrmEntity({ deletedAt: null });
      const domain = UserMapper.toDomain(orm);

      expect(domain.deletedAt).toBeNull();
    });

    it('should correctly map a soft-deleted and inactive user entity', () => {
      const orm = buildOrmEntity({ isActive: false, deletedAt: deleted });
      const domain = UserMapper.toDomain(orm);

      expect(domain.isActive).toBe(false);
      expect(domain.deletedAt).toEqual(deleted);
    });

    it.each(Object.values(UserRole))(
      'should map role correctly when role is %s',
      (role) => {
        const orm = buildOrmEntity({ role });
        const domain = UserMapper.toDomain(orm);

        expect(domain.role).toBe(role);
      },
    );

    it('should return a new User instance on every call (no shared reference)', () => {
      const orm = buildOrmEntity();
      const domain1 = UserMapper.toDomain(orm);
      const domain2 = UserMapper.toDomain(orm);

      expect(domain1).not.toBe(domain2);
    });
  });

  // ===================================================================
  // toPersistence
  // ===================================================================

  describe('toPersistence', () => {
    it('should map all fields from domain entity to ORM entity', () => {
      const domain = buildDomainEntity();
      const orm = UserMapper.toPersistence(domain);

      expect(orm).toBeInstanceOf(UserOrmEntity);
      expect(orm.id).toBe(domain.id);
      expect(orm.username).toBe(domain.username.value);
      expect(orm.email).toBe(domain.email.value);
      expect(orm.passwordHash).toBe(domain.passwordHash.value);
      expect(orm.role).toBe(domain.role);
      expect(orm.isActive).toBe(domain.isActive);
      expect(orm.createdAt).toEqual(domain.createdAt);
      expect(orm.updatedAt).toEqual(domain.updatedAt);
      expect(orm.deletedAt).toBeNull();
    });

    it('should map deletedAt as null when domain entity is not soft-deleted', () => {
      const domain = buildDomainEntity({ deletedAt: null });
      const orm = UserMapper.toPersistence(domain);

      expect(orm.deletedAt).toBeNull();
    });

    it('should map a soft-deleted and inactive domain entity to persistence', () => {
      const domain = buildDomainEntity({ isActive: false, deletedAt: deleted });
      const orm = UserMapper.toPersistence(domain);

      expect(orm.isActive).toBe(false);
      expect(orm.deletedAt).toEqual(deleted);
    });

    it.each(Object.values(UserRole))(
      'should map role correctly when role is %s',
      (role) => {
        const domain = buildDomainEntity({ role });
        const orm = UserMapper.toPersistence(domain);

        expect(orm.role).toBe(role);
      },
    );

    it('should return a new UserOrmEntity instance on every call (no shared reference)', () => {
      const domain = buildDomainEntity();
      const orm1 = UserMapper.toPersistence(domain);
      const orm2 = UserMapper.toPersistence(domain);

      expect(orm1).not.toBe(orm2);
    });
  });

  // ===================================================================
  // round-trip
  // ===================================================================

  describe('round-trip (toDomain → toPersistence)', () => {
    it('should preserve all fields after toDomain then toPersistence', () => {
      const originalOrm = buildOrmEntity();
      const domain = UserMapper.toDomain(originalOrm);
      const roundTrippedOrm = UserMapper.toPersistence(domain);

      expect(roundTrippedOrm.id).toBe(originalOrm.id);
      expect(roundTrippedOrm.username).toBe(originalOrm.username);
      expect(roundTrippedOrm.email).toBe(originalOrm.email);
      expect(roundTrippedOrm.passwordHash).toBe(originalOrm.passwordHash);
      expect(roundTrippedOrm.role).toBe(originalOrm.role);
      expect(roundTrippedOrm.isActive).toBe(originalOrm.isActive);
      expect(roundTrippedOrm.createdAt).toEqual(originalOrm.createdAt);
      expect(roundTrippedOrm.updatedAt).toEqual(originalOrm.updatedAt);
      expect(roundTrippedOrm.deletedAt).toBeNull();
    });

    it('should preserve all fields after toPersistence then toDomain', () => {
      const originalDomain = buildDomainEntity();
      const orm = UserMapper.toPersistence(originalDomain);
      const roundTrippedDomain = UserMapper.toDomain(orm);

      expect(roundTrippedDomain.id).toBe(originalDomain.id);
      expect(roundTrippedDomain.username.value).toBe(
        originalDomain.username.value,
      );
      expect(roundTrippedDomain.email.value).toBe(originalDomain.email.value);
      expect(roundTrippedDomain.passwordHash.value).toBe(
        originalDomain.passwordHash.value,
      );
      expect(roundTrippedDomain.role).toBe(originalDomain.role);
      expect(roundTrippedDomain.isActive).toBe(originalDomain.isActive);
      expect(roundTrippedDomain.createdAt).toEqual(originalDomain.createdAt);
      expect(roundTrippedDomain.updatedAt).toEqual(originalDomain.updatedAt);
      expect(roundTrippedDomain.deletedAt).toBeNull();
    });
  });
});
