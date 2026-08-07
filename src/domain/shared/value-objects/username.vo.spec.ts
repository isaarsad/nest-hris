import { Username } from './username.vo.js';
import { InvalidUsernameError } from '../errors/index.js';

describe('Username', () => {
  describe('constructor and getter', () => {
    // --- Happy Paths ---
    it('should create a valid Username with alphanumeric characters', () => {
      const username = new Username('johndoe1');
      expect(username.value).toBe('johndoe1');
    });

    it('should accept a username with boundary lengths (5 and 30 chars)', () => {
      const minUsername = new Username('abcde'); // 5 chars
      const maxUsername = new Username('a'.repeat(30)); // 30 chars

      expect(minUsername.value).toBe('abcde');
      expect(maxUsername.value).toBe('a'.repeat(30));
    });

    it('should accept underscores, hyphens, numbers, and mixed case letters', () => {
      expect(new Username('john_doe').value).toBe('john_doe');
      expect(new Username('john-doe').value).toBe('john-doe');
      expect(new Username('JohnDoe').value).toBe('JohnDoe');
      expect(new Username('12345').value).toBe('12345');
    });

    it('should trim surrounding whitespace before storing', () => {
      const username = new Username('  johndoe  ');
      expect(username.value).toBe('johndoe');
    });

    // --- Invalid Inputs & Edge Cases ---
    it('should throw InvalidUsernameError for empty or whitespace-only strings', () => {
      expect(() => new Username('')).toThrow(InvalidUsernameError);
      expect(() => new Username('     ')).toThrow(InvalidUsernameError);
    });

    it('should throw InvalidUsernameError for username shorter than 5 chars after trim', () => {
      expect(() => new Username('abcd')).toThrow(InvalidUsernameError); // 4 chars
      expect(() => new Username('  abc  ')).toThrow(InvalidUsernameError); // total length 7, but after trim() = 3
    });

    it('should throw InvalidUsernameError for username longer than 30 characters', () => {
      const thirtyOneChars = 'a'.repeat(31);
      expect(() => new Username(thirtyOneChars)).toThrow(InvalidUsernameError);
    });

    it('should throw InvalidUsernameError for invalid characters or spaces inside', () => {
      expect(() => new Username('john doe')).toThrow(InvalidUsernameError);
      expect(() => new Username('john@doe')).toThrow(InvalidUsernameError);
      expect(() => new Username('john.doe')).toThrow(InvalidUsernameError);
    });

    it('should throw InvalidUsernameError for non-string input', () => {
      expect(() => new Username(12345 as unknown as string)).toThrow(
        InvalidUsernameError,
      );
      expect(() => new Username(null as unknown as string)).toThrow(
        InvalidUsernameError,
      );
      expect(() => new Username(undefined as unknown as string)).toThrow(
        InvalidUsernameError,
      );
    });
  });

  describe('equals()', () => {
    it('should return true for two Username instances with same value', () => {
      const u1 = new Username('johndoe');
      const u2 = new Username('johndoe');
      expect(u1.equals(u2)).toBe(true);
    });

    it('should return false for two Username instances with different values', () => {
      const u1 = new Username('johndoe');
      const u2 = new Username('janedoe');
      expect(u1.equals(u2)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const u1 = new Username('JohnDoe');
      const u2 = new Username('johndoe');
      expect(u1.equals(u2)).toBe(false);
    });

    it('should return false when compared with null, undefined, or plain object', () => {
      const u = new Username('johndoe');
      expect(u.equals(null)).toBe(false);
      expect(u.equals(undefined)).toBe(false);
      expect(u.equals({ value: 'johndoe' } as unknown as Username)).toBe(false);
    });
  });
});
