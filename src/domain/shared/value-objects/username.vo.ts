import { InvalidUsernameError } from '../errors/index.js';

export class Username {
  private readonly _value: string;

  constructor(value: string) {
    if (typeof value !== 'string') {
      throw new InvalidUsernameError(value);
    }

    const normalizedUsername = value.trim().toLowerCase();

    if (!Username.isValid(normalizedUsername)) {
      throw new InvalidUsernameError(value);
    }

    this._value = normalizedUsername;
  }

  get value(): string {
    return this._value;
  }

  private static isValid(normalizedUsername: string): boolean {
    const usernameRegex = /^[a-z0-9_-]{5,30}$/;
    return usernameRegex.test(normalizedUsername);
  }

  public equals(other?: Username | null): boolean {
    if (!other || !(other instanceof Username)) return false;
    return this._value === other.value;
  }
}
