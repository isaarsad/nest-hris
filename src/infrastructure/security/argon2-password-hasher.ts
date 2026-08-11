import argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../domain/shared/ports/password-hasher.port.js';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return argon2.hash(plainText);
  }

  async compare(plainText: string, hashedText: string): Promise<boolean> {
    try {
      return await argon2.verify(hashedText, plainText);
    } catch {
      return false;
    }
  }
}
