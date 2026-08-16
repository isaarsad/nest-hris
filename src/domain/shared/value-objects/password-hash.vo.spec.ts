import { PasswordHash } from './password-hash.vo.js';
import { InvalidPasswordHashError } from '../errors/index.js';

describe('PasswordHash', () => {
  const validBcryptHash =
    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

  const minValidHash = '12345678901234567890';

  describe('constructor', () => {
    // --- Happy Paths ---

    it('should create a valid PasswordHash and return raw value from getter', () => {
      const hash = new PasswordHash(validBcryptHash);
      expect(hash.value).toBe(validBcryptHash);
    });

    it('should accept a hash with exact boundary length (20 characters)', () => {
      const hash = new PasswordHash(minValidHash);
      expect(hash.value).toBe(minValidHash);
    });

    it('should accept a hash longer than 20 characters', () => {
      const longHash = 'a'.repeat(60);
      const hash = new PasswordHash(longHash);
      expect(hash.value).toBe(longHash);
    });

    it('should trim leading and trailing whitespace from the stored value', () => {
      const paddedHash = `   ${validBcryptHash}   `;
      const hash = new PasswordHash(paddedHash);

      expect(hash.value).toBe(validBcryptHash);
    });

    // --- Invalid Inputs / Edge Cases ---
    it('should throw InvalidPasswordHashError for empty string', () => {
      expect(() => new PasswordHash('')).toThrow(InvalidPasswordHashError);
    });

    it('should throw InvalidPasswordHashError for a string shorter than 20 characters', () => {
      expect(() => new PasswordHash('short')).toThrow(InvalidPasswordHashError);
    });

    it('should throw InvalidPasswordHashError for a string of exactly 19 characters', () => {
      expect(() => new PasswordHash('1234567890123456789')).toThrow(
        InvalidPasswordHashError,
      );
    });

    it('should throw InvalidPasswordHashError when trimmed length is less than 20', () => {
      expect(() => new PasswordHash(' '.repeat(25))).toThrow(
        InvalidPasswordHashError,
      );
      expect(() => new PasswordHash('    1234567890    ')).toThrow(
        InvalidPasswordHashError,
      );
    });

    it('should throw InvalidPasswordHashError for non-string inputs', () => {
      expect(() => new PasswordHash(123 as unknown as string)).toThrow(
        InvalidPasswordHashError,
      );
      expect(() => new PasswordHash(null as unknown as string)).toThrow(
        InvalidPasswordHashError,
      );
      expect(() => new PasswordHash(undefined as unknown as string)).toThrow(
        InvalidPasswordHashError,
      );
    });
  });
});
