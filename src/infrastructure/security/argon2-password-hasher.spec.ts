import argon2 from 'argon2';
import { Argon2PasswordHasher } from './argon2-password-hasher.js';

vi.mock('argon2');

describe('Argon2PasswordHasher', () => {
  let hasher: Argon2PasswordHasher;

  beforeEach(() => {
    hasher = new Argon2PasswordHasher();
    vi.clearAllMocks();
  });

  // ===================================================================
  // hash
  // ===================================================================

  describe('hash', () => {
    it('should return the hashed string produced by argon2.hash', async () => {
      const fakeHash = '$argon2id$v=19$m=65536,t=3,p=4$fakesalt$fakehash';
      vi.mocked(argon2.hash).mockResolvedValue(fakeHash);

      const result = await hasher.hash('mySecret123');

      expect(result).toBe(fakeHash);
      expect(argon2.hash).toHaveBeenCalledExactlyOnceWith('mySecret123');
    });

    it('should propagate errors thrown by argon2.hash', async () => {
      vi.mocked(argon2.hash).mockRejectedValue(new Error('hashing failed'));

      await expect(hasher.hash('anyPassword')).rejects.toThrow(
        'hashing failed',
      );
    });
  });

  // ===================================================================
  // compare
  // ===================================================================

  describe('compare', () => {
    it('should return true when argon2.verify confirms a matching password', async () => {
      vi.mocked(argon2.verify).mockResolvedValue(true);

      const result = await hasher.compare('mySecret123', '$argon2id$fakehash');

      expect(result).toBe(true);
      expect(argon2.verify).toHaveBeenCalledExactlyOnceWith(
        '$argon2id$fakehash',
        'mySecret123',
      );
    });

    it('should return false when argon2.verify rejects a non-matching password', async () => {
      vi.mocked(argon2.verify).mockResolvedValue(false);

      const result = await hasher.compare(
        'wrongPassword',
        '$argon2id$fakehash',
      );

      expect(result).toBe(false);
    });

    it('should return false (not throw) when argon2.verify throws an error', async () => {
      vi.mocked(argon2.verify).mockRejectedValue(new Error('malformed hash'));

      const result = await hasher.compare('anyPassword', 'invalid-hash');

      expect(result).toBe(false);
    });

    it('should return false when argon2.verify throws with an empty string hash', async () => {
      vi.mocked(argon2.verify).mockRejectedValue(
        new Error('pchstr must contain a $'),
      );

      const result = await hasher.compare('anyPassword', '');

      expect(result).toBe(false);
    });
  });
});
