import { Email } from './email.vo.js';
import { InvalidEmailError } from '../errors/index.js';

describe('Email', () => {
  describe('constructor and value getter', () => {
    // --- Happy Paths ---
    it('should create a valid Email and normalize it (trim and lowercase)', () => {
      const email = new Email('  User.Name+Tag@Mail.EXAMPLE.Co.ID  ');
      expect(email.value).toBe('user.name+tag@mail.example.co.id');
    });

    it('should accept a valid simple email address', () => {
      const email = new Email('user@example.com');
      expect(email.value).toBe('user@example.com');
    });

    // --- Invalid Inputs & Edge Cases ---
    it('should throw InvalidEmailError for non-string inputs', () => {
      expect(() => new Email(123 as unknown as string)).toThrow(
        InvalidEmailError,
      );
      expect(() => new Email(null as unknown as string)).toThrow(
        InvalidEmailError,
      );
      expect(() => new Email(undefined as unknown as string)).toThrow(
        InvalidEmailError,
      );
      expect(() => new Email({} as unknown as string)).toThrow(
        InvalidEmailError,
      );
    });

    it('should throw InvalidEmailError for empty or whitespace-only strings', () => {
      expect(() => new Email('')).toThrow(InvalidEmailError);
      expect(() => new Email('   ')).toThrow(InvalidEmailError);
    });

    it('should throw InvalidEmailError for malformed email structures', () => {
      expect(() => new Email('userexample.com')).toThrow(InvalidEmailError); // Missing @
      expect(() => new Email('@example.com')).toThrow(InvalidEmailError); // Missing local part
      expect(() => new Email('user@')).toThrow(InvalidEmailError); // Missing domain
      expect(() => new Email('user@example')).toThrow(InvalidEmailError); // Missing TLD (.com, .id, dll)
      expect(() => new Email('user @example.com')).toThrow(InvalidEmailError); // Space inside local part
      expect(() => new Email('user@ex ample.com')).toThrow(InvalidEmailError); // Space inside domain part
      expect(() => new Email('user@@example.com')).toThrow(InvalidEmailError); // Multiple @
    });
  });

  describe('equals()', () => {
    it('should return true for two Email instances with same value', () => {
      const email1 = new Email('user@example.com');
      const email2 = new Email('user@example.com');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return true when comparing emails that normalize to the same value', () => {
      const email1 = new Email('USER@EXAMPLE.COM');
      const email2 = new Email('user@example.com');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for two Email instances with different values', () => {
      const email1 = new Email('user@example.com');
      const email2 = new Email('other@example.com');
      expect(email1.equals(email2)).toBe(false);
    });

    it('should return false when compared with null, undefined, or plain objects', () => {
      const email = new Email('user@example.com');

      expect(email.equals(null as unknown as Email)).toBe(false);
      expect(email.equals(undefined as unknown as Email)).toBe(false);
      expect(
        email.equals({ value: 'user@example.com' } as unknown as Email),
      ).toBe(false);
    });
  });
});
