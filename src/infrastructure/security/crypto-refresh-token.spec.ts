import { createHash } from 'node:crypto';
import { CryptoRefreshToken } from './crypto-refresh-token.js';
import { config } from '../config/index.js';

describe('CryptoRefreshToken', () => {
  let cryptoRefreshToken: CryptoRefreshToken;
  const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    cryptoRefreshToken = new CryptoRefreshToken();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===================================================================
  // generate
  // ===================================================================

  describe('generate', () => {
    it('should return a 64-character hex string from 32 random bytes', () => {
      const token = cryptoRefreshToken.generate();

      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return unique tokens on subsequent calls', () => {
      const token1 = cryptoRefreshToken.generate();
      const token2 = cryptoRefreshToken.generate();

      expect(token1).not.toBe(token2);
    });
  });

  // ===================================================================
  // hash
  // ===================================================================

  describe('hash', () => {
    it('should return a SHA-256 hex digest of the given token', () => {
      const plainToken = 'test-plain-refresh-token-123';
      const expectedHash = createHash('sha256')
        .update(plainToken)
        .digest('hex');

      const result = cryptoRefreshToken.hash(plainToken);

      expect(result).toBe(expectedHash);
      expect(result).toHaveLength(64);
    });
  });

  // ===================================================================
  // getExpiresAt
  // ===================================================================

  describe('getExpiresAt', () => {
    it('should return a Date with configured idle TTL offset from now', () => {
      const expectedMs =
        FIXED_NOW.getTime() +
        config.auth.refreshToken.idleDays * 24 * 60 * 60 * 1000;

      const expiresAt = cryptoRefreshToken.getExpiresAt();

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBe(expectedMs);
    });
  });

  // ===================================================================
  // getAbsoluteExpiresAt
  // ===================================================================

  describe('getAbsoluteExpiresAt', () => {
    it('should return a Date with configured absolute TTL offset from now', () => {
      const expectedMs =
        FIXED_NOW.getTime() +
        config.auth.refreshToken.absoluteDays * 24 * 60 * 60 * 1000;

      const absoluteExpiresAt = cryptoRefreshToken.getAbsoluteExpiresAt();

      expect(absoluteExpiresAt).toBeInstanceOf(Date);
      expect(absoluteExpiresAt.getTime()).toBe(expectedMs);
    });
  });
});
