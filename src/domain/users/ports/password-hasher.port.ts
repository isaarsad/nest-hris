import { PasswordHash } from '../../shared/value-objects/password-hash.vo.js';

export interface PasswordHasher {
  hash(plainText: string): Promise<PasswordHash>;
  compare(plainText: string, hashedText: PasswordHash): Promise<boolean>;
}
