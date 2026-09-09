import {
  RefreshTokenInvalidPayloadError,
  RefreshTokenInvalidHashError,
  RefreshTokenInconsistentStateError,
} from '../errors/index.js';
import {
  RefreshToken,
  RefreshTokenProps,
  RotateRefreshTokenResult,
} from './refresh-token.entity.js';

describe('RefreshToken entity', () => {
  const VALID_HASH = 'a'.repeat(64);
  const NEW_VALID_HASH = 'b'.repeat(64);

  // Fixed "now" used across all time-sensitive tests.
  // Chosen to be well in the past so future/past comparisons are unambiguous.
  const NOW = new Date('2026-01-01T00:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseProps: RefreshTokenProps = {
    id: 'token-001',
    userId: 'user-001',
    tokenHash: VALID_HASH,
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    absoluteExpiresAt: new Date('2199-01-01T00:00:00.000Z'),
    revokedAt: null,
    replacedByTokenId: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const buildToken = (
    overrides: Partial<RefreshTokenProps> = {},
  ): RefreshToken => new RefreshToken({ ...baseProps, ...overrides });

  // === HAPPY PATH: constructor ===

  it('should create RefreshToken correctly with valid props', () => {
    const token = buildToken();

    expect(token.id).toBe('token-001');
    expect(token.userId).toBe('user-001');
    expect(token.tokenHash).toBe(VALID_HASH);
    expect(token.expiresAt).toEqual(new Date('2099-01-01T00:00:00.000Z'));
    expect(token.absoluteExpiresAt).toEqual(
      new Date('2199-01-01T00:00:00.000Z'),
    );
    expect(token.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    expect(token.revokedAt).toBeNull();
    expect(token.replacedByTokenId).toBeNull();
  });

  it('should trim id on construction', () => {
    const token = buildToken({ id: '  token-002  ' });
    expect(token.id).toBe('token-002');
  });

  it('should trim userId on construction', () => {
    const token = buildToken({ userId: '  user-002  ' });
    expect(token.userId).toBe('user-002');
  });

  it('should trim tokenHash on construction', () => {
    const paddedHash = `  ${VALID_HASH}  `;
    const token = buildToken({ tokenHash: paddedHash });
    expect(token.tokenHash).toBe(VALID_HASH);
  });

  it('should accept a revoked token with revokedAt set', () => {
    const revokedAt = new Date('2024-06-01T00:00:00.000Z');
    const token = buildToken({ revokedAt });

    expect(token.revokedAt).toEqual(revokedAt);
  });

  it('should accept a revoked token with replacedByTokenId', () => {
    const token = buildToken({
      revokedAt: new Date('2024-06-01T00:00:00.000Z'),
      replacedByTokenId: 'token-999',
    });

    expect(token.replacedByTokenId).toBe('token-999');
  });

  it('should trim replacedByTokenId on construction', () => {
    const token = buildToken({
      revokedAt: new Date('2024-06-01T00:00:00.000Z'),
      replacedByTokenId: '  token-999  ',
    });

    expect(token.replacedByTokenId).toBe('token-999');
  });

  it('should accept token hash with uppercase hex characters', () => {
    const upperHash = 'A'.repeat(64);
    const token = buildToken({ tokenHash: upperHash });
    expect(token.tokenHash).toBe(upperHash);
  });

  // === HAPPY PATH: static create() ===

  it('should create a new RefreshToken via static create() with correct defaults', () => {
    const token = RefreshToken.create({
      id: 'token-100',
      userId: 'user-100',
      tokenHash: VALID_HASH,
      expiresAt: new Date('2099-12-31T00:00:00.000Z'),
      absoluteExpiresAt: new Date('2199-12-31T00:00:00.000Z'),
    });

    expect(token.id).toBe('token-100');
    expect(token.userId).toBe('user-100');
    expect(token.tokenHash).toBe(VALID_HASH);
    expect(token.expiresAt).toEqual(new Date('2099-12-31T00:00:00.000Z'));
    expect(token.absoluteExpiresAt).toEqual(
      new Date('2199-12-31T00:00:00.000Z'),
    );
    expect(token.revokedAt).toBeNull();
    expect(token.replacedByTokenId).toBeNull();
    // createdAt should be the frozen NOW
    expect(token.createdAt).toEqual(NOW);
  });

  // === isExpired() ===

  it('should correctly evaluate expiration based on the provided date', () => {
    const expiresAt = new Date('2024-06-01T00:00:00.000Z');
    const token = buildToken({ expiresAt });

    const beforeExpiry = new Date('2024-05-31T23:59:59.999Z');
    const afterExpiry = new Date('2024-06-01T00:00:00.001Z');

    expect(token.isExpired(beforeExpiry)).toBe(false);
    expect(token.isExpired(expiresAt)).toBe(true); // Boundary: now === expiresAt
    expect(token.isExpired(afterExpiry)).toBe(true);
  });

  it('should default to current time (frozen NOW) when no date is provided', () => {
    // NOW = 2026-01-01; past token expired in 2025, future token expires in 2027
    const pastToken = buildToken({
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2025-01-01T00:00:00.000Z'),
      absoluteExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });
    const futureToken = buildToken({
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    });

    expect(pastToken.isExpired()).toBe(true);
    expect(futureToken.isExpired()).toBe(false);
  });

  // === isRevoked() ===

  it('should return false when revokedAt is null', () => {
    const token = buildToken({ revokedAt: null });
    expect(token.isRevoked()).toBe(false);
  });

  it('should return true when revokedAt is a Date', () => {
    const token = buildToken({
      revokedAt: new Date('2024-06-01T00:00:00.000Z'),
    });
    expect(token.isRevoked()).toBe(true);
  });

  // === isValid() ===

  it('should return true when token is active and not revoked', () => {
    const token = buildToken({
      revokedAt: null,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });
    expect(token.isValid()).toBe(true);
  });

  it('should return false when token is expired', () => {
    const token = buildToken({
      createdAt: new Date('1999-01-01T00:00:00.000Z'),
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      absoluteExpiresAt: new Date('2001-01-01T00:00:00.000Z'),
    });
    expect(token.isValid()).toBe(false);
  });

  it('should return false when token is revoked', () => {
    const token = buildToken({
      revokedAt: new Date('2024-06-01T00:00:00.000Z'),
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });
    expect(token.isValid()).toBe(false);
  });

  it('should return false when token is both expired and revoked', () => {
    const token = buildToken({
      createdAt: new Date('1999-01-01T00:00:00.000Z'),
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      absoluteExpiresAt: new Date('2001-01-01T00:00:00.000Z'),
      revokedAt: new Date('1999-06-01T00:00:00.000Z'),
    });
    expect(token.isValid()).toBe(false);
  });

  it('should use the provided now date for validity check', () => {
    const expiresAt = new Date('2024-06-01T00:00:00.000Z');
    const token = buildToken({ expiresAt });
    const beforeExpiry = new Date('2024-05-31T23:59:59.999Z');

    expect(token.isValid(beforeExpiry)).toBe(true);
    expect(token.isValid(expiresAt)).toBe(false);
  });

  // === revoke() ===

  it('should revoke a token without replacement', () => {
    const token = buildToken({ revokedAt: null });

    token.revoke();

    expect(token.isRevoked()).toBe(true);
    // revokedAt should be set to the frozen NOW
    expect(token.revokedAt).toEqual(NOW);
    expect(token.replacedByTokenId).toBeNull();
  });

  it('should set replacedByTokenId when provided to revoke()', () => {
    const token = buildToken({ revokedAt: null });

    token.revoke('token-new');

    expect(token.replacedByTokenId).toBe('token-new');
  });

  it('should trim replacedByTokenId passed to revoke()', () => {
    const token = buildToken({ revokedAt: null });

    token.revoke('  token-new  ');

    expect(token.replacedByTokenId).toBe('token-new');
  });

  it('should be idempotent: calling revoke() on an already-revoked token does nothing', () => {
    const originalRevokedAt = new Date('2024-06-01T00:00:00.000Z');
    const token = buildToken({
      revokedAt: originalRevokedAt,
      replacedByTokenId: 'original-token-id',
    });

    token.revoke('new-attempted-token-id');

    expect(token.revokedAt).toEqual(originalRevokedAt);
    expect(token.replacedByTokenId).toBe('original-token-id');
  });

  // === rotate() ===

  it('should rotate a valid token and return revokedOldToken and newToken', () => {
    const newExpiresAt = new Date(NOW.getTime() + 60 * 60 * 1000); // NOW + 1 hour

    const oldToken = buildToken({ revokedAt: null });
    const result: RotateRefreshTokenResult = oldToken.rotate({
      newId: 'token-new',
      newTokenHash: NEW_VALID_HASH,
      expiresAt: newExpiresAt,
    });

    expect(result.revokedOldToken).toBe(oldToken);
    expect(result.revokedOldToken.isRevoked()).toBe(true);
    expect(result.revokedOldToken.replacedByTokenId).toBe('token-new');

    const { newToken } = result;
    expect(newToken.id).toBe('token-new');
    expect(newToken.userId).toBe(oldToken.userId);
    expect(newToken.tokenHash).toBe(NEW_VALID_HASH);
    expect(newToken.isRevoked()).toBe(false);
    expect(newToken.absoluteExpiresAt).toEqual(oldToken.absoluteExpiresAt);
    // createdAt of the new token should be the frozen NOW
    expect(newToken.createdAt).toEqual(NOW);
    // expiresAt = newExpiresAt (within absoluteExpiresAt)
    expect(newToken.expiresAt).toEqual(newExpiresAt);
  });

  it('should cap newToken.expiresAt to absoluteExpiresAt when requested expiresAt exceeds it', () => {
    const absoluteExpiresAt = new Date(NOW.getTime() + 5_000); // NOW + 5s
    const requestedExpiresAt = new Date(NOW.getTime() + 60 * 60 * 1000); // 1 hour — exceeds absoluteExpiresAt

    const oldToken = buildToken({
      expiresAt: new Date(NOW.getTime() + 3_000),
      absoluteExpiresAt,
    });

    const { newToken } = oldToken.rotate({
      newId: 'token-capped',
      newTokenHash: NEW_VALID_HASH,
      expiresAt: requestedExpiresAt,
    });

    expect(newToken.expiresAt).toEqual(absoluteExpiresAt);
  });

  it('should use requested expiresAt when it is within absoluteExpiresAt', () => {
    const requestedExpiresAt = new Date(NOW.getTime() + 60 * 1000); // NOW + 1 minute
    const absoluteExpiresAt = new Date(NOW.getTime() + 24 * 60 * 60 * 1000); // NOW + 24h

    const oldToken = buildToken({
      expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000),
      absoluteExpiresAt,
    });

    const { newToken } = oldToken.rotate({
      newId: 'token-ttl',
      newTokenHash: NEW_VALID_HASH,
      expiresAt: requestedExpiresAt,
    });

    // expiresAt = requestedExpiresAt (not capped)
    expect(newToken.expiresAt).toEqual(requestedExpiresAt);
  });

  it('should throw RefreshTokenInconsistentStateError when rotating an already-revoked token', () => {
    const token = buildToken({
      revokedAt: new Date('2024-06-01T00:00:00.000Z'),
      replacedByTokenId: 'old-replacement',
    });

    expect(() =>
      token.rotate({
        newId: 'token-x',
        newTokenHash: NEW_VALID_HASH,
        expiresAt: new Date(NOW.getTime() + 1000),
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });

  it('should throw RefreshTokenInconsistentStateError when rotating an expired token', () => {
    const token = buildToken({
      createdAt: new Date('1999-01-01T00:00:00.000Z'),
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      absoluteExpiresAt: new Date('2001-01-01T00:00:00.000Z'),
      revokedAt: null,
    });

    expect(() =>
      token.rotate({
        newId: 'token-x',
        newTokenHash: NEW_VALID_HASH,
        expiresAt: new Date(NOW.getTime() + 1000),
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });

  // === wasReusedAfterRevocation() ===

  it('should return false when token is not revoked', () => {
    const token = buildToken({
      revokedAt: null,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });
    expect(token.wasReusedAfterRevocation()).toBe(false);
  });

  it('should return true when token is revoked but not yet expired', () => {
    const token = buildToken({
      revokedAt: new Date('2024-06-01T00:00:00.000Z'),
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });
    expect(token.wasReusedAfterRevocation()).toBe(true);
  });

  it('should return false when token is revoked and already expired', () => {
    const token = buildToken({
      createdAt: new Date('1999-01-01T00:00:00.000Z'),
      revokedAt: new Date('1999-06-01T00:00:00.000Z'),
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      absoluteExpiresAt: new Date('2001-01-01T00:00:00.000Z'),
    });
    expect(token.wasReusedAfterRevocation()).toBe(false);
  });

  it('should use the provided now date for wasReusedAfterRevocation check', () => {
    const expiresAt = new Date('2024-06-01T00:00:00.000Z');
    const token = buildToken({
      revokedAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt,
    });

    const beforeExpiry = new Date('2024-05-31T00:00:00.000Z');
    const afterExpiry = new Date('2024-07-01T00:00:00.000Z');

    expect(token.wasReusedAfterRevocation(beforeExpiry)).toBe(true);
    expect(token.wasReusedAfterRevocation(afterExpiry)).toBe(false);
  });

  // === equals() ===

  it('should return true when two tokens have the same id', () => {
    const token1 = buildToken({ id: 'token-abc' });
    const token2 = buildToken({
      id: 'token-abc',
      userId: 'different-user',
    });

    expect(token1.equals(token2)).toBe(true);
  });

  it('should return false when two tokens have different ids', () => {
    const token1 = buildToken({ id: 'token-001' });
    const token2 = buildToken({ id: 'token-002' });

    expect(token1.equals(token2)).toBe(false);
  });

  // === VALIDATION: id ===

  it('should throw RefreshTokenInvalidPayloadError when id is empty', () => {
    expect(() => buildToken({ id: '' })).toThrow(
      RefreshTokenInvalidPayloadError,
    );
  });

  it('should throw RefreshTokenInvalidPayloadError when id is only whitespace', () => {
    expect(() => buildToken({ id: '   ' })).toThrow(
      RefreshTokenInvalidPayloadError,
    );
  });

  it('should throw RefreshTokenInvalidPayloadError when id is not a string', () => {
    expect(() => buildToken({ id: 123 as unknown as string })).toThrow(
      RefreshTokenInvalidPayloadError,
    );
  });

  // === VALIDATION: userId ===

  it('should throw RefreshTokenInvalidPayloadError when userId is empty', () => {
    expect(() => buildToken({ userId: '' })).toThrow(
      RefreshTokenInvalidPayloadError,
    );
  });

  it('should throw RefreshTokenInvalidPayloadError when userId is only whitespace', () => {
    expect(() => buildToken({ userId: '   ' })).toThrow(
      RefreshTokenInvalidPayloadError,
    );
  });

  it('should throw RefreshTokenInvalidPayloadError when userId is not a string', () => {
    expect(() => buildToken({ userId: 999 as unknown as string })).toThrow(
      RefreshTokenInvalidPayloadError,
    );
  });

  // === VALIDATION: tokenHash ===

  it('should throw RefreshTokenInvalidHashError when tokenHash is not a string', () => {
    expect(() => buildToken({ tokenHash: 12345 as unknown as string })).toThrow(
      RefreshTokenInvalidHashError,
    );
  });

  it('should throw RefreshTokenInvalidHashError when tokenHash is too short', () => {
    expect(() => buildToken({ tokenHash: 'abc123' })).toThrow(
      RefreshTokenInvalidHashError,
    );
  });

  it('should throw RefreshTokenInvalidHashError when tokenHash is too long', () => {
    expect(() => buildToken({ tokenHash: 'a'.repeat(65) })).toThrow(
      RefreshTokenInvalidHashError,
    );
  });

  it('should throw RefreshTokenInvalidHashError when tokenHash contains non-hex characters', () => {
    expect(() => buildToken({ tokenHash: 'z'.repeat(64) })).toThrow(
      RefreshTokenInvalidHashError,
    );
  });

  it('should throw RefreshTokenInvalidHashError when tokenHash is empty', () => {
    expect(() => buildToken({ tokenHash: '' })).toThrow(
      RefreshTokenInvalidHashError,
    );
  });

  // === VALIDATION: expiresAt / absoluteExpiresAt / createdAt ===

  it('should throw RefreshTokenInvalidPayloadError when expiresAt is not a Date', () => {
    expect(() =>
      buildToken({ expiresAt: 'not-a-date' as unknown as Date }),
    ).toThrow(RefreshTokenInvalidPayloadError);
  });

  it('should throw RefreshTokenInvalidPayloadError when absoluteExpiresAt is not a Date', () => {
    expect(() =>
      buildToken({ absoluteExpiresAt: 'not-a-date' as unknown as Date }),
    ).toThrow(RefreshTokenInvalidPayloadError);
  });

  it('should throw RefreshTokenInvalidPayloadError when createdAt is not a Date', () => {
    expect(() =>
      buildToken({ createdAt: 'not-a-date' as unknown as Date }),
    ).toThrow(RefreshTokenInvalidPayloadError);
  });

  // === VALIDATION: inconsistent state – expiresAt before/equal to createdAt ===

  it('should throw RefreshTokenInconsistentStateError when expiresAt equals createdAt', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    expect(() =>
      buildToken({
        createdAt: now,
        expiresAt: now,
        absoluteExpiresAt: new Date('2025-01-01T00:00:00.000Z'),
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });

  it('should throw RefreshTokenInconsistentStateError when expiresAt is earlier than createdAt', () => {
    expect(() =>
      buildToken({
        createdAt: new Date('2024-06-01T00:00:00.000Z'),
        expiresAt: new Date('2024-01-01T00:00:00.000Z'),
        absoluteExpiresAt: new Date('2025-01-01T00:00:00.000Z'),
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });

  // === VALIDATION: inconsistent state – absoluteExpiresAt ===

  it('should throw RefreshTokenInconsistentStateError when absoluteExpiresAt equals createdAt', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    expect(() =>
      buildToken({
        createdAt: now,
        expiresAt: new Date('2024-06-01T00:00:00.000Z'),
        absoluteExpiresAt: now,
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });

  it('should throw RefreshTokenInconsistentStateError when absoluteExpiresAt is earlier than createdAt', () => {
    expect(() =>
      buildToken({
        createdAt: new Date('2024-06-01T00:00:00.000Z'),
        expiresAt: new Date('2025-01-01T00:00:00.000Z'),
        absoluteExpiresAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });

  it('should throw RefreshTokenInconsistentStateError when expiresAt is later than absoluteExpiresAt', () => {
    expect(() =>
      buildToken({
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        expiresAt: new Date('2025-06-01T00:00:00.000Z'),
        absoluteExpiresAt: new Date('2025-01-01T00:00:00.000Z'),
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });

  // === VALIDATION: inconsistent state – revokedAt ===

  it('should throw RefreshTokenInvalidPayloadError when revokedAt is not a Date and not null', () => {
    expect(() =>
      buildToken({ revokedAt: 'not-a-date' as unknown as Date }),
    ).toThrow(RefreshTokenInvalidPayloadError);
  });

  it('should throw RefreshTokenInconsistentStateError when revokedAt is earlier than createdAt', () => {
    expect(() =>
      buildToken({
        createdAt: new Date('2024-06-01T00:00:00.000Z'),
        revokedAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });

  // === VALIDATION: inconsistent state – replacedByTokenId without revokedAt ===

  it('should throw RefreshTokenInvalidPayloadError when replacedByTokenId is not a string and not null', () => {
    expect(() =>
      buildToken({
        revokedAt: new Date('2024-06-01T00:00:00.000Z'),
        replacedByTokenId: 123 as unknown as string,
      }),
    ).toThrow(RefreshTokenInvalidPayloadError);
  });

  it('should throw RefreshTokenInvalidPayloadError when replacedByTokenId is an empty string', () => {
    expect(() =>
      buildToken({
        revokedAt: new Date('2024-06-01T00:00:00.000Z'),
        replacedByTokenId: '',
      }),
    ).toThrow(RefreshTokenInvalidPayloadError);
  });

  it('should throw RefreshTokenInvalidPayloadError when replacedByTokenId is only whitespace', () => {
    expect(() =>
      buildToken({
        revokedAt: new Date('2024-06-01T00:00:00.000Z'),
        replacedByTokenId: '   ',
      }),
    ).toThrow(RefreshTokenInvalidPayloadError);
  });

  it('should throw RefreshTokenInconsistentStateError when replacedByTokenId is set but revokedAt is null', () => {
    expect(() =>
      buildToken({
        revokedAt: null,
        replacedByTokenId: 'token-999',
      }),
    ).toThrow(RefreshTokenInconsistentStateError);
  });
});
