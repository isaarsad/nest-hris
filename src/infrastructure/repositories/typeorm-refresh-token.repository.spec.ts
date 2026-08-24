import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../database/data-source.js';
import { RefreshTokenOrmEntity } from '../database/entities/refresh-token.orm-entity.js';
import { UserOrmEntity } from '../database/entities/user.orm-entity.js';
import { TypeOrmRefreshTokenRepository } from './typeorm-refresh-token.repository.js';
import { RefreshTokenTableTestHelper } from '../../../test/helpers/refresh-token-table-test.helper.js';
import { UserTableTestHelper } from '../../../test/helpers/user-table-test.helper.js';
import { RefreshToken } from '../../domain/auth/entities/refresh-token.entity.js';
import { RefreshTokenAlreadyExistsError } from '../../domain/auth/errors/index.js';
import { randomUUID } from 'crypto';

describe('TypeOrmRefreshTokenRepository', () => {
  let module: TestingModule;
  let repository: TypeOrmRefreshTokenRepository;
  let dataSource: DataSource;
  let helper: RefreshTokenTableTestHelper;
  let userHelper: UserTableTestHelper;

  // A shared userId seeded once per suite
  let seedUserId: string;

  const makeToken = (
    overrides: Partial<{
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      absoluteExpiresAt: Date;
    }> = {},
  ): RefreshToken => {
    const now = new Date();
    return RefreshToken.create({
      id: overrides.id ?? randomUUID(),
      userId: overrides.userId ?? seedUserId,
      tokenHash: overrides.tokenHash ?? 'b'.repeat(64),
      expiresAt:
        overrides.expiresAt ?? new Date(now.getTime() + 1000 * 60 * 60),
      absoluteExpiresAt:
        overrides.absoluteExpiresAt ??
        new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
    });
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...dataSourceOptions,
          migrations: [],
        }),
        TypeOrmModule.forFeature([RefreshTokenOrmEntity, UserOrmEntity]),
      ],
      providers: [TypeOrmRefreshTokenRepository],
    }).compile();

    repository = module.get(TypeOrmRefreshTokenRepository);
    dataSource = module.get(DataSource);
    helper = new RefreshTokenTableTestHelper(dataSource);
    userHelper = new UserTableTestHelper(dataSource);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await helper.clear();
    await userHelper.clear();

    const user = await userHelper.insert({
      username: 'tokenowner',
      email: 'owner@example.com',
    });
    seedUserId = user.id;
  });

  // ─── save ────────────────────────────────────────────────────────────────────

  describe('save()', () => {
    it('should persist a new refresh token', async () => {
      const token = makeToken({ tokenHash: 'c'.repeat(64) });

      await repository.save(token);

      const raw = await helper.findByIdRaw(token.id);

      expect(raw).not.toBeNull();
      expect(raw!.id).toBe(token.id);
      expect(raw!.userId).toBe(token.userId);
      expect(raw!.tokenHash).toBe(token.tokenHash);
      expect(raw!.expiresAt).toEqual(token.expiresAt);
      expect(raw!.absoluteExpiresAt).toEqual(token.absoluteExpiresAt);
      expect(raw!.revokedAt).toBeNull();
      expect(raw!.replacedByTokenId).toBeNull();
      expect(raw!.createdAt).toEqual(token.createdAt);
    });

    it('should update an existing token state when saved again with mutated fields', async () => {
      const token = makeToken({ tokenHash: 'd'.repeat(64) });
      await repository.save(token);

      const replacementId = randomUUID();
      token.revoke(replacementId);

      await repository.save(token);

      const raw = await helper.findByIdRaw(token.id);

      expect(raw).not.toBeNull();
      expect(raw!.id).toBe(token.id);
      expect(raw!.userId).toBe(token.userId);
      expect(raw!.tokenHash).toBe(token.tokenHash);
      expect(raw!.expiresAt).toEqual(token.expiresAt);
      expect(raw!.absoluteExpiresAt).toEqual(token.absoluteExpiresAt);
      expect(raw!.revokedAt).not.toBeNull();
      expect(raw!.revokedAt).toEqual(token.revokedAt);
      expect(raw!.replacedByTokenId).toBe(replacementId);
      expect(raw!.createdAt).toEqual(token.createdAt);
    });

    it('should throw RefreshTokenAlreadyExistsError when tokenHash is duplicated', async () => {
      const duplicateHash = 'e'.repeat(64);

      await helper.insert({ userId: seedUserId, tokenHash: duplicateHash });

      const token = makeToken({ tokenHash: duplicateHash });

      await expect(repository.save(token)).rejects.toThrow(
        RefreshTokenAlreadyExistsError,
      );

      const inDb = await helper.findByIdRaw(token.id);
      expect(inDb).toBeNull();
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the refresh token when found', async () => {
      const now = new Date();
      const inserted = await helper.insert({
        userId: seedUserId,
        tokenHash: 'f'.repeat(64),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
        absoluteExpiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
      });

      const result = await repository.findById(inserted.id);

      expect(result).toStrictEqual(
        new RefreshToken({
          id: inserted.id,
          userId: seedUserId,
          tokenHash: inserted.tokenHash,
          expiresAt: inserted.expiresAt,
          absoluteExpiresAt: inserted.absoluteExpiresAt,
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: inserted.createdAt,
        }),
      );
    });

    it('should return null when token is not found', async () => {
      const result = await repository.findById(randomUUID());
      expect(result).toBeNull();
    });
  });

  // ─── findByTokenHash ─────────────────────────────────────────────────────────

  describe('findByTokenHash()', () => {
    it('should return the token when tokenHash matches', async () => {
      const hash = '1'.repeat(64);
      const now = new Date();
      const inserted = await helper.insert({
        userId: seedUserId,
        tokenHash: hash,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
        absoluteExpiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
      });

      const result = await repository.findByTokenHash(hash);

      expect(result).not.toBeNull();
      expect(result).toBeInstanceOf(RefreshToken);
      expect(result!.id).toBe(inserted.id);
      expect(result!.tokenHash).toBe(hash);
    });

    it('should return null when tokenHash does not exist', async () => {
      const result = await repository.findByTokenHash('0'.repeat(64));
      expect(result).toBeNull();
    });
  });

  // ─── revokeAllByUserId ───────────────────────────────────────────────────────

  describe('revokeAllByUserId()', () => {
    it('should set revokedAt on all active tokens for the given user', async () => {
      const now = new Date();
      const exp = new Date(now.getTime() + 1000 * 60 * 60);
      const absExp = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

      const t1 = await helper.insert({
        userId: seedUserId,
        tokenHash: 'a1'.padEnd(64, 'a'),
        expiresAt: exp,
        absoluteExpiresAt: absExp,
      });
      const t2 = await helper.insert({
        userId: seedUserId,
        tokenHash: 'a2'.padEnd(64, 'a'),
        expiresAt: exp,
        absoluteExpiresAt: absExp,
      });

      await repository.revokeAllByUserId(seedUserId);

      const raw1 = await helper.findByIdRaw(t1.id);
      const raw2 = await helper.findByIdRaw(t2.id);

      expect(raw1!.revokedAt).not.toBeNull();
      expect(raw2!.revokedAt).not.toBeNull();
    });

    it('should not touch tokens that are already revoked', async () => {
      const now = new Date();
      const exp = new Date(now.getTime() + 1000 * 60 * 60);
      const absExp = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
      const alreadyRevokedAt = new Date(now.getTime() - 1000 * 60);

      const revoked = await helper.insert({
        userId: seedUserId,
        tokenHash: 'b1'.padEnd(64, 'b'),
        expiresAt: exp,
        absoluteExpiresAt: absExp,
        revokedAt: alreadyRevokedAt,
      });

      await repository.revokeAllByUserId(seedUserId);

      const raw = await helper.findByIdRaw(revoked.id);
      // revokedAt should remain the original value, not overwritten
      expect(raw!.revokedAt).toEqual(alreadyRevokedAt);
    });

    it('should not revoke tokens belonging to other users', async () => {
      const otherUser = await userHelper.insert({
        username: 'otheruser',
        email: 'other@example.com',
      });
      const now = new Date();
      const exp = new Date(now.getTime() + 1000 * 60 * 60);
      const absExp = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

      const otherToken = await helper.insert({
        userId: otherUser.id,
        tokenHash: 'c1'.padEnd(64, 'c'),
        expiresAt: exp,
        absoluteExpiresAt: absExp,
      });

      // Revoke only for seedUserId
      await repository.revokeAllByUserId(seedUserId);

      const raw = await helper.findByIdRaw(otherToken.id);
      expect(raw!.revokedAt).toBeNull();
    });
  });

  // ─── deleteExpired ───────────────────────────────────────────────────────────

  describe('deleteExpired()', () => {
    it('should delete tokens whose expiresAt is on or before "now" and return the count', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60); // 1h ago
      const future = new Date(now.getTime() + 1000 * 60 * 60); // 1h from now
      const absExp = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

      const t1 = await helper.insert({
        userId: seedUserId,
        tokenHash: 'd1'.padEnd(64, '0'),
        expiresAt: past,
        absoluteExpiresAt: absExp,
      });
      const t2 = await helper.insert({
        userId: seedUserId,
        tokenHash: 'd2'.padEnd(64, '0'),
        expiresAt: past,
        absoluteExpiresAt: absExp,
      });
      const alive = await helper.insert({
        userId: seedUserId,
        tokenHash: 'd3'.padEnd(64, '0'),
        expiresAt: future,
        absoluteExpiresAt: absExp,
      });

      const deleted = await repository.deleteExpired(now);

      expect(deleted).toBe(2);

      expect(await helper.findByIdRaw(t1.id)).toBeNull();
      expect(await helper.findByIdRaw(t2.id)).toBeNull();

      expect(await helper.findByIdRaw(alive.id)).not.toBeNull();
    });

    it('should return 0 and delete nothing when no tokens are expired', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 1000 * 60 * 60);
      const absExp = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

      const activeToken = await helper.insert({
        userId: seedUserId,
        tokenHash: 'e1'.padEnd(64, '0'),
        expiresAt: future,
        absoluteExpiresAt: absExp,
      });

      const deleted = await repository.deleteExpired(now);

      expect(deleted).toBe(0);
      expect(await helper.findByIdRaw(activeToken.id)).not.toBeNull();
    });
  });
});
