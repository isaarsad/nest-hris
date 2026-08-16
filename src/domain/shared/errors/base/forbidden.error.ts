import { DomainError, DomainErrorCategory } from './domain.error.js';

export abstract class ForbiddenError extends DomainError {
  readonly category: DomainErrorCategory = 'FORBIDDEN';
}
