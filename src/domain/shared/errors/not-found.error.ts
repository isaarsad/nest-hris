import { DomainError, DomainErrorCategory } from './domain.error.js';

export abstract class NotFoundError extends DomainError {
  readonly category: DomainErrorCategory = 'NOT_FOUND';
}
