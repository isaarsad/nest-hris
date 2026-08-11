import { User } from '../../domain/users/entities/user.entity.js';
import {
  Email,
  PasswordHash,
  Username,
} from '../../domain/shared/value-objects/index.js';
import { UserOrmEntity } from '../database/entities/user.orm-entity.js';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return new User({
      id: orm.id,
      username: new Username(orm.username),
      email: new Email(orm.email),
      passwordHash: new PasswordHash(orm.passwordHash),
      role: orm.role,
      isActive: orm.isActive,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      deletedAt: orm.deletedAt,
    });
  }

  static toPersistence(domain: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = domain.id;
    orm.username = domain.username.value;
    orm.email = domain.email.value;
    orm.passwordHash = domain.passwordHash.value;
    orm.role = domain.role;
    orm.isActive = domain.isActive;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    orm.deletedAt = domain.deletedAt;

    return orm;
  }
}
