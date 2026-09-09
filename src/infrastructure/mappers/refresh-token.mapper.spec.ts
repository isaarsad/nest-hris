import {
  RefreshToken,
  RefreshTokenProps,
} from '../../domain/auth/entities/refresh-token.entity.js';
import { RefreshTokenOrmEntity } from '../database/entities/refresh-token.orm-entity.js';
import { RefreshTokenMapper } from './refresh-token.mapper.js';

describe('RefreshTokenMapper', () => {
  // valid 64-char hex-like string accepted by SHA256_HEX_REGEX
  const TOKEN_HASH = 'a'.repeat(64);
  const now = new Date('2024-01-01T00:00:00.000Z');
  const expires = new Date('2024-02-01T00:00:00.000Z');
  const absoluteExpires = new Date('2024-06-01T00:00:00.000Z');
  const revoked = new Date('2024-01-15T00:00:00.000Z');

  const buildOrmEntity = (
    overrides: Partial<RefreshTokenOrmEntity> = {},
  ): RefreshTokenOrmEntity => {
    const orm = new RefreshTokenOrmEntity();
    orm.id = 'token-001';
    orm.userId = 'user-001';
    orm.tokenHash = TOKEN_HASH;
    orm.expiresAt = expires;
    orm.absoluteExpiresAt = absoluteExpires;
    orm.revokedAt = null;
    orm.replacedByTokenId = null;
    orm.createdAt = now;
    return Object.assign(orm, overrides);
  };

  const buildDomainEntity = (
    overrides: Partial<RefreshTokenProps> = {},
  ): RefreshToken =>
    new RefreshToken({
      id: 'token-001',
      userId: 'user-001',
      tokenHash: TOKEN_HASH,
      expiresAt: expires,
      absoluteExpiresAt: absoluteExpires,
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: now,
      ...overrides,
    });

  // ===================================================================
  // toDomain
  // ===================================================================

  describe('toDomain', () => {
    it('should map all fields from ORM entity to domain entity', () => {
      const orm = buildOrmEntity();
      const domain = RefreshTokenMapper.toDomain(orm);

      expect(domain).toBeInstanceOf(RefreshToken);
      expect(domain.id).toBe(orm.id);
      expect(domain.userId).toBe(orm.userId);
      expect(domain.tokenHash).toBe(orm.tokenHash);
      expect(domain.expiresAt).toEqual(orm.expiresAt);
      expect(domain.absoluteExpiresAt).toEqual(orm.absoluteExpiresAt);
      expect(domain.revokedAt).toBeNull();
      expect(domain.replacedByTokenId).toBeNull();
      expect(domain.createdAt).toEqual(orm.createdAt);
    });

    it('should map a revoked ORM entity with non-null revokedAt and replacedByTokenId', () => {
      const orm = buildOrmEntity({
        revokedAt: revoked,
        replacedByTokenId: 'token-002',
      });
      const domain = RefreshTokenMapper.toDomain(orm);

      expect(domain.revokedAt).toEqual(revoked);
      expect(domain.replacedByTokenId).toBe('token-002');
    });

    it('should return a new RefreshToken instance on every call (no shared reference)', () => {
      const orm = buildOrmEntity();
      const domain1 = RefreshTokenMapper.toDomain(orm);
      const domain2 = RefreshTokenMapper.toDomain(orm);

      expect(domain1).not.toBe(domain2);
    });
  });

  // ===================================================================
  // toPersistence
  // ===================================================================

  describe('toPersistence', () => {
    it('should map all fields from domain entity to ORM entity', () => {
      const domain = buildDomainEntity();
      const orm = RefreshTokenMapper.toPersistence(domain);

      expect(orm).toBeInstanceOf(RefreshTokenOrmEntity);
      expect(orm.id).toBe(domain.id);
      expect(orm.userId).toBe(domain.userId);
      expect(orm.tokenHash).toBe(domain.tokenHash);
      expect(orm.expiresAt).toEqual(domain.expiresAt);
      expect(orm.absoluteExpiresAt).toEqual(domain.absoluteExpiresAt);
      expect(orm.revokedAt).toBeNull();
      expect(orm.replacedByTokenId).toBeNull();
      expect(orm.createdAt).toEqual(domain.createdAt);
    });

    it('should map a revoked domain entity with non-null revokedAt and replacedByTokenId', () => {
      const domain = buildDomainEntity({
        revokedAt: revoked,
        replacedByTokenId: 'token-002',
      });
      const orm = RefreshTokenMapper.toPersistence(domain);

      expect(orm.revokedAt).toEqual(revoked);
      expect(orm.replacedByTokenId).toBe('token-002');
    });

    it('should return a new RefreshTokenOrmEntity instance on every call (no shared reference)', () => {
      const domain = buildDomainEntity();
      const orm1 = RefreshTokenMapper.toPersistence(domain);
      const orm2 = RefreshTokenMapper.toPersistence(domain);

      expect(orm1).not.toBe(orm2);
    });
  });

  // ===================================================================
  // round-trip
  // ===================================================================

  describe('round-trip (toDomain → toPersistence)', () => {
    it('should preserve all fields after toDomain then toPersistence', () => {
      const originalOrm = buildOrmEntity();
      const domain = RefreshTokenMapper.toDomain(originalOrm);
      const roundTrippedOrm = RefreshTokenMapper.toPersistence(domain);

      expect(roundTrippedOrm.id).toBe(originalOrm.id);
      expect(roundTrippedOrm.userId).toBe(originalOrm.userId);
      expect(roundTrippedOrm.tokenHash).toBe(originalOrm.tokenHash);
      expect(roundTrippedOrm.expiresAt).toEqual(originalOrm.expiresAt);
      expect(roundTrippedOrm.absoluteExpiresAt).toEqual(
        originalOrm.absoluteExpiresAt,
      );
      expect(roundTrippedOrm.revokedAt).toBeNull();
      expect(roundTrippedOrm.replacedByTokenId).toBeNull();
      expect(roundTrippedOrm.createdAt).toEqual(originalOrm.createdAt);
    });

    it('should preserve all fields after toPersistence then toDomain', () => {
      const originalDomain = buildDomainEntity();
      const orm = RefreshTokenMapper.toPersistence(originalDomain);
      const roundTrippedDomain = RefreshTokenMapper.toDomain(orm);

      expect(roundTrippedDomain.id).toBe(originalDomain.id);
      expect(roundTrippedDomain.userId).toBe(originalDomain.userId);
      expect(roundTrippedDomain.tokenHash).toBe(originalDomain.tokenHash);
      expect(roundTrippedDomain.expiresAt).toEqual(originalDomain.expiresAt);
      expect(roundTrippedDomain.absoluteExpiresAt).toEqual(
        originalDomain.absoluteExpiresAt,
      );
      expect(roundTrippedDomain.revokedAt).toBeNull();
      expect(roundTrippedDomain.replacedByTokenId).toBeNull();
      expect(roundTrippedDomain.createdAt).toEqual(originalDomain.createdAt);
    });
  });
});
