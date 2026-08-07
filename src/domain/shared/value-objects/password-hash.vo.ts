import { InvalidPasswordHashError } from '../errors/index.js';

export class PasswordHash {
  private readonly _value: string;

  constructor(value: string) {
    if (!PasswordHash.isValid(value)) {
      throw new InvalidPasswordHashError(value);
    }
    this._value = value.trim();
  }

  get value(): string {
    return this._value;
  }

  private static isValid(hash: string): boolean {
    if (typeof hash !== 'string') return false;
    const hashTrim = hash.trim();

    return hashTrim.length >= 20;
  }
}
