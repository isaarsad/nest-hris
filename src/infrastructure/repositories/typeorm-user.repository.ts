import { Injectable } from '@nestjs/common';
import {
  UserFilter,
  UserRepository,
} from '../../domain/users/user.repository.js';
import { User } from '../../domain/users/entities/user.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { UserOrmEntity } from '../database/entities/user.orm-entity.js';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { UserMapper } from '../mappers/user.mapper.js';
import { UserAlreadyExistsError } from '../../domain/users/errors/user-already-exist.error.js';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepository: Repository<UserOrmEntity>,
  ) {}

  async save(user: User): Promise<User> {
    try {
      const ormEntity = UserMapper.toPersistence(user);

      const record = await this.userRepository.save(ormEntity);

      return UserMapper.toDomain(record);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
          constraint?: string;
        };

        if (driverError.code === '23505') {
          if (driverError.constraint === 'UQ_USERS_USERNAME_ACTIVE') {
            throw new UserAlreadyExistsError('username', user.username.value);
          } else if (driverError.constraint === 'UQ_USERS_EMAIL_ACTIVE') {
            throw new UserAlreadyExistsError('email', user.email.value);
          }
        }
      }

      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.userRepository.findOneBy({ id });
    return record ? UserMapper.toDomain(record) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const record = await this.userRepository.findOneBy({ username });
    return record ? UserMapper.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.userRepository.findOneBy({ email });
    return record ? UserMapper.toDomain(record) : null;
  }

  async findAll(filter: UserFilter): Promise<User[]> {
    const { includeInactive = false, includeDeleted = false } = filter;

    const where: FindOptionsWhere<UserOrmEntity> = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    const records = await this.userRepository.find({
      where,
      withDeleted: includeDeleted,
      order: {
        deletedAt: {
          direction: 'ASC',
          nulls: 'FIRST',
        },
        isActive: 'DESC',
        username: 'ASC',
      },
    });

    return records.map((record) => UserMapper.toDomain(record));
  }

  async existById(id: string): Promise<boolean> {
    return this.userRepository.existsBy({ id });
  }

  async existByUsername(username: string): Promise<boolean> {
    return this.userRepository.existsBy({ username });
  }

  async existByEmail(email: string): Promise<boolean> {
    return this.userRepository.existsBy({ email });
  }
}
