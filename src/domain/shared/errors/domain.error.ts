export type DomainErrorCategory =
  'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN' | 'INVARIANT';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly category: DomainErrorCategory;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
