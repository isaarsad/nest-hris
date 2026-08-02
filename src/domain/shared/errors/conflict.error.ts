import { DomainError, DomainErrorCategory } from './domain.error.js';

export abstract class ConflictError extends DomainError {
  readonly category: DomainErrorCategory = 'CONFLICT';
}
