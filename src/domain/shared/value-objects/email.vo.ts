import { InvalidEmailError } from '../errors/index.js';

export class Email {
  private readonly _value: string;

  constructor(value: string) {
    if (typeof value !== 'string') {
      throw new InvalidEmailError(value);
    }

    const normalized = Email.normalize(value);

    if (!Email.isValid(normalized)) {
      throw new InvalidEmailError(value);
    }

    this._value = normalized;
  }

  get value(): string {
    return this._value;
  }

  private static normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  private static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public equals(other: Email): boolean {
    if (!other || !(other instanceof Email)) return false;
    return this._value === other.value;
  }
}
