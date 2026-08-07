import { DomainError, DomainErrorCategory } from './domain.error.js';

export abstract class InvariantError extends DomainError {
  readonly category: DomainErrorCategory = 'INVARIANT';
}
