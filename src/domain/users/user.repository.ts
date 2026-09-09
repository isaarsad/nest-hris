import { User } from './entities/user.entity.js';
import { Email, Username } from '../shared/value-objects/index.js';

export interface UserFilter {
  includeInactive?: boolean;
  includeDeleted?: boolean;
}

export interface UserRepository {
  save(user: User): Promise<User>;

  findById(id: string): Promise<User | null>;

  findByUsername(username: Username): Promise<User | null>;

  findByEmail(email: Email): Promise<User | null>;

  findAll(filter: UserFilter): Promise<User[]>;

  existById(id: string): Promise<boolean>;

  existByUsername(username: string): Promise<boolean>;

  existByEmail(email: string): Promise<boolean>;
}
