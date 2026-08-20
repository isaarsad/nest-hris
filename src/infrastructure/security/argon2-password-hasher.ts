import argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../domain/users/ports/password-hasher.port.js';
import { PasswordHash } from '../../domain/shared/value-objects/password-hash.vo.js';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plainText: string): Promise<PasswordHash> {
    return new PasswordHash(await argon2.hash(plainText));
  }

  async compare(plainText: string, hashedText: PasswordHash): Promise<boolean> {
    try {
      return await argon2.verify(hashedText.value, plainText);
    } catch {
      return false;
    }
  }
}
