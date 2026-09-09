import { DomainError, DomainErrorCategory } from './domain.error.js';

export abstract class UnauthorizedError extends DomainError {
  readonly category: DomainErrorCategory = 'UNAUTHORIZED';
}
