import { User } from './entities/user.entity.js';

export interface UserFilter {
  includeInactive?: boolean;
  includeDeleted?: boolean;
}

export interface UserRepository {
  save(user: User): Promise<User>;

  findById(id: string): Promise<User | null>;

  findByUsername(username: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  findAll(filter: UserFilter): Promise<User[]>;

  existById(id: string): Promise<boolean>;

  existByUsername(username: string): Promise<boolean>;

  existByEmail(email: string): Promise<boolean>;
}
