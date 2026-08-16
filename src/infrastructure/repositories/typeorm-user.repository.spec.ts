import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../database/data-source.js';
import { UserOrmEntity } from '../database/entities/user.orm-entity.js';
import { TypeOrmUserRepository } from './typeorm-user.repository.js';
import { UserTableTestHelper } from '../../../test/helpers/user-table-test.helper.js';
import { User } from '../../domain/users/entities/user.entity.js';
import { UserAlreadyExistsError } from '../../domain/users/errors/user-already-exist.error.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';
import {
  Username,
  Email,
  PasswordHash,
} from '../../domain/shared/value-objects/index.js';
import { randomUUID } from 'crypto';

describe('TypeOrmUserRepository', () => {
  let module: TestingModule;
  let repository: TypeOrmUserRepository;
  let dataSource: DataSource;
  let helper: UserTableTestHelper;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          ...dataSourceOptions,
          migrations: [],
        }),
        TypeOrmModule.forFeature([UserOrmEntity]),
      ],
      providers: [TypeOrmUserRepository],
    }).compile();

    repository = module.get(TypeOrmUserRepository);
    dataSource = module.get(DataSource);
    helper = new UserTableTestHelper(dataSource);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await helper.clear();
  });

  // ─── save ────────────────────────────────────────────────────────────────────

  describe('save()', () => {
    it('should persist and return a new user', async () => {
      const user = User.create({
        id: randomUUID(),
        username: 'johndoe',
        email: 'john@example.com',
        passwordHash: '$2b$10$hashedpassword',
        role: UserRole.EMPLOYEE,
      });

      const result = await repository.save(user);

      expect(result).toStrictEqual(
        new User({
          id: user.id,
          username: new Username('johndoe'),
          email: new Email('john@example.com'),
          passwordHash: new PasswordHash('$2b$10$hashedpassword'),
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          deletedAt: null,
        }),
      );

      const raw = await helper.findByIdRaw(user.id);
      expect(raw).toStrictEqual({
        id: user.id,
        username: 'johndoe',
        email: 'john@example.com',
        passwordHash: '$2b$10$hashedpassword',
        role: UserRole.EMPLOYEE,
        isActive: true,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        deletedAt: null,
      });
    });

    it('should update an existing user when saved again', async () => {
      const inserted = await helper.insert({
        username: 'janedoe',
        email: 'jane@example.com',
        role: UserRole.EMPLOYEE,
      });

      // Re-save with the same id but elevated role
      const user = new User({
        id: inserted.id,
        username: new Username('janedoe'),
        email: new Email('jane@example.com'),
        passwordHash: new PasswordHash('$2b$10$hashedpassword'),
        role: UserRole.HR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await repository.save(user);

      expect(result).toStrictEqual(
        new User({
          id: user.id,
          username: new Username('janedoe'),
          email: new Email('jane@example.com'),
          passwordHash: new PasswordHash('$2b$10$hashedpassword'),
          role: UserRole.HR,
          isActive: true,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          deletedAt: null,
        }),
      );

      const raw = await helper.findByIdRaw(inserted.id);
      expect(raw).toStrictEqual({
        id: user.id,
        username: 'janedoe',
        email: 'jane@example.com',
        passwordHash: '$2b$10$hashedpassword',
        role: UserRole.HR,
        isActive: true,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        deletedAt: null,
      });
    });

    it('should throw UserAlreadyExistsError when username is duplicated', async () => {
      await helper.insert({
        username: 'duplicate',
        email: 'original@example.com',
      });

      const user = User.create({
        id: randomUUID(),
        username: 'duplicate',
        email: 'another@example.com',
        passwordHash: '$2b$10$hashedpassword',
        role: UserRole.EMPLOYEE,
      });

      await expect(repository.save(user)).rejects.toThrow(
        UserAlreadyExistsError,
      );

      const inDb = await helper.findByIdRaw(user.id);
      expect(inDb).toBeNull();
    });

    it('should throw UserAlreadyExistsError when email is duplicated', async () => {
      await helper.insert({
        username: 'firstuser',
        email: 'shared@example.com',
      });

      const user = User.create({
        id: randomUUID(),
        username: 'seconduser',
        email: 'shared@example.com',
        passwordHash: '$2b$10$hashedpassword',
        role: UserRole.EMPLOYEE,
      });

      await expect(repository.save(user)).rejects.toThrow(
        UserAlreadyExistsError,
      );

      const inDb = await helper.findByIdRaw(user.id);
      expect(inDb).toBeNull();
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the user when found', async () => {
      const user = await helper.insert({
        username: 'findme',
        email: 'findme@example.com',
        role: UserRole.HR,
      });

      const result = await repository.findById(user.id);

      expect(result).toStrictEqual(
        new User({
          id: user.id,
          username: new Username('findme'),
          email: new Email('findme@example.com'),
          passwordHash: new PasswordHash(user.passwordHash),
          role: UserRole.HR,
          isActive: true,
          createdAt: result!.createdAt,
          updatedAt: result!.updatedAt,
          deletedAt: null,
        }),
      );
    });

    it('should return null when user is not found', async () => {
      const result = await repository.findById(randomUUID());
      expect(result).toBeNull();
    });
  });

  // ─── findByUsername ──────────────────────────────────────────────────────────

  describe('findByUsername()', () => {
    it('should return the user when username matches', async () => {
      await helper.insert({
        username: 'targetuser',
        email: 'target@example.com',
      });

      const result = await repository.findByUsername('targetuser');

      expect(result).toBeInstanceOf(User);
      expect(result).not.toBeNull();
      expect(result!.username.value).toBe('targetuser');
      expect(result!.email.value).toBe('target@example.com');
    });

    it('should return null when username does not exist', async () => {
      const result = await repository.findByUsername('ghostuser');
      expect(result).toBeNull();
    });
  });

  // ─── findByEmail ─────────────────────────────────────────────────────────────

  describe('findByEmail()', () => {
    it('should return the user when email matches', async () => {
      await helper.insert({
        username: 'emailuser',
        email: 'emailuser@example.com',
      });

      const result = await repository.findByEmail('emailuser@example.com');

      expect(result).toBeInstanceOf(User);
      expect(result).not.toBeNull();
      expect(result!.username.value).toBe('emailuser');
      expect(result!.email.value).toBe('emailuser@example.com');
    });

    it('should return null when email does not exist', async () => {
      const result = await repository.findByEmail('ghost@example.com');
      expect(result).toBeNull();
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return only active users by default', async () => {
      await helper.insert({
        username: 'activeuser',
        email: 'active@example.com',
        isActive: true,
      });
      await helper.insert({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        isActive: false,
      });

      const results = await repository.findAll({});

      expect(results).toHaveLength(1);
      expect(results).toStrictEqual([
        new User({
          id: results[0]!.id,
          username: new Username('activeuser'),
          email: new Email('active@example.com'),
          passwordHash: new PasswordHash('$2b$10$hashedpassword'),
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
      ]);
    });

    it('should include inactive users when includeInactive is true', async () => {
      await helper.insert({
        username: 'activeuser',
        email: 'active@example.com',
        isActive: true,
      });
      await helper.insert({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        isActive: false,
      });

      const results = await repository.findAll({ includeInactive: true });

      expect(results).toHaveLength(2);
      expect(results).toStrictEqual([
        new User({
          id: results[0]!.id,
          username: new Username('activeuser'),
          email: new Email('active@example.com'),
          passwordHash: new PasswordHash('$2b$10$hashedpassword'),
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
        new User({
          id: results[1]!.id,
          username: new Username('inactiveuser'),
          email: new Email('inactive@example.com'),
          passwordHash: new PasswordHash('$2b$10$hashedpassword'),
          role: UserRole.EMPLOYEE,
          isActive: false,
          createdAt: results[1]!.createdAt,
          updatedAt: results[1]!.updatedAt,
          deletedAt: null,
        }),
      ]);
    });

    it('should not include soft-deleted users by default', async () => {
      await helper.insert({
        username: 'aliveuser',
        email: 'alive@example.com',
      });
      await helper.insert({
        username: 'deleteduser',
        email: 'deleted@example.com',
        deletedAt: new Date(),
      });

      const results = await repository.findAll({ includeInactive: true });

      expect(results).toHaveLength(1);
      expect(results).toStrictEqual([
        new User({
          id: results[0]!.id,
          username: new Username('aliveuser'),
          email: new Email('alive@example.com'),
          passwordHash: new PasswordHash('$2b$10$hashedpassword'),
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
      ]);
    });

    it('should include soft-deleted users when includeDeleted is true', async () => {
      const futureDate = new Date(Date.now() + 10000);

      await helper.insert({
        username: 'aliveuser',
        email: 'alive@example.com',
      });
      await helper.insert({
        username: 'deleteduser',
        email: 'deleted@example.com',
        isActive: false,
        deletedAt: futureDate,
      });

      const results = await repository.findAll({
        includeInactive: true,
        includeDeleted: true,
      });

      expect(results).toHaveLength(2);
      expect(results).toStrictEqual([
        new User({
          id: results[0]!.id,
          username: new Username('aliveuser'),
          email: new Email('alive@example.com'),
          passwordHash: new PasswordHash('$2b$10$hashedpassword'),
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: results[0]!.createdAt,
          updatedAt: results[0]!.updatedAt,
          deletedAt: null,
        }),
        new User({
          id: results[1]!.id,
          username: new Username('deleteduser'),
          email: new Email('deleted@example.com'),
          passwordHash: new PasswordHash('$2b$10$hashedpassword'),
          role: UserRole.EMPLOYEE,
          isActive: false,
          createdAt: results[1]!.createdAt,
          updatedAt: results[1]!.updatedAt,
          deletedAt: results[1]!.deletedAt,
        }),
      ]);
    });

    it('should return an empty array when the table is empty', async () => {
      const results = await repository.findAll({});
      expect(results).toHaveLength(0);
    });

    it('should return results ordered by isActive DESC then username ASC', async () => {
      await helper.insert({
        username: 'zetaa',
        email: 'zeta@example.com',
        isActive: true,
      });
      await helper.insert({
        username: 'alpha',
        email: 'alpha@example.com',
        isActive: false,
      });
      await helper.insert({
        username: 'betaa',
        email: 'beta@example.com',
        isActive: true,
      });

      const results = await repository.findAll({ includeInactive: true });

      expect(results).toHaveLength(3);
      expect(results[0]!.username.value).toBe('betaa');
      expect(results[1]!.username.value).toBe('zetaa');
      expect(results[2]!.username.value).toBe('alpha');
    });
  });

  // ─── existById ───────────────────────────────────────────────────────────────

  describe('existById()', () => {
    it('should return true when the user exists', async () => {
      const inserted = await helper.insert({
        username: 'existtest',
        email: 'exist@example.com',
      });
      const result = await repository.existById(inserted.id);
      expect(result).toBe(true);
    });

    it('should return false when the user does not exist', async () => {
      const result = await repository.existById(randomUUID());
      expect(result).toBe(false);
    });
  });

  // ─── existByUsername ─────────────────────────────────────────────────────────

  describe('existByUsername()', () => {
    it('should return true when the username exists', async () => {
      await helper.insert({
        username: 'knownuser',
        email: 'known@example.com',
      });
      const result = await repository.existByUsername('knownuser');
      expect(result).toBe(true);
    });

    it('should return false when the username does not exist', async () => {
      const result = await repository.existByUsername('unknownuser');
      expect(result).toBe(false);
    });

    it('should be case-insensitive and match regardless of casing', async () => {
      await helper.insert({ username: 'Alpha' });

      const result = await repository.existByUsername('alpha');

      expect(result).toBe(true);
    });
  });

  // ─── existByEmail ─────────────────────────────────────────────────────────────

  describe('existByEmail()', () => {
    it('should return true when the email exists', async () => {
      await helper.insert({
        username: 'emailcheck',
        email: 'check@example.com',
      });
      const result = await repository.existByEmail('check@example.com');
      expect(result).toBe(true);
    });

    it('should return false when the email does not exist', async () => {
      const result = await repository.existByEmail('nobody@example.com');
      expect(result).toBe(false);
    });

    it('should be case-insensitive and match regardless of casing', async () => {
      await helper.insert({ email: 'Alpha@example.com' });

      const result = await repository.existByEmail('alpha@example.com');

      expect(result).toBe(true);
    });
  });
});
