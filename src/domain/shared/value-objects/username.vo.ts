import { InvalidUsernameError } from '../errors/index.js';

export class Username {
  private readonly _value: string;

  constructor(value: string) {
    if (!Username.isValid(value)) {
      throw new InvalidUsernameError(value);
    }
    this._value = value.trim();
  }

  get value(): string {
    return this._value;
  }

  private static isValid(username: string): boolean {
    if (typeof username !== 'string') return false;
    const usernameTrim = username.trim();

    const usernameRegex = /^[a-zA-Z0-9_-]{5,30}$/;
    return usernameRegex.test(usernameTrim);
  }

  public equals(other?: Username | null): boolean {
    if (!other || !(other instanceof Username)) return false;
    return this._value === other.value;
  }
}
