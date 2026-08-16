import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';

// Domain Layer (Abstract Class / Interface Repository)
import { UserRepository } from '../../../domain/users/user.repository.js';
import { PasswordHasher } from '../../../domain/shared/ports/password-hasher.port.js';

// Application Layer (Use Cases)
import { CreateUserUseCase } from '../../../application/users/create-user.use-case.js';
import { GetUsersUseCase } from '../../../application/users/get-users.use-case.js';
import { ActivateUserUseCase } from '../../../application/users/activate-user.use-case.js';
import { DeactivateUserUseCase } from '../../../application/users/deactivate-user.use-case.js';
import { ChangeUserRoleUseCase } from '../../../application/users/change-user-role.use-case.js';

// Infrastructure Layer (TypeORM Entity & Repository Implementation)
import { UserOrmEntity } from '../../../infrastructure/database/entities/user.orm-entity.js';
import { TypeOrmUserRepository } from '../../../infrastructure/repositories/typeorm-user.repository.js';
import { Argon2PasswordHasher } from '../../../infrastructure/security/argon2-password-hasher.js';

// Presentation Layer (Controller)
import { UsersController } from './users.controller.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasher,
    },
    {
      provide: CreateUserUseCase,
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
      useFactory: (
        userRepo: UserRepository,
        passwordHasher: PasswordHasher,
      ) => {
        return new CreateUserUseCase(
          userRepo,
          () => randomUUID(),
          passwordHasher,
        );
      },
    },
    {
      provide: GetUsersUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (userRepo: UserRepository) => {
        return new GetUsersUseCase(userRepo);
      },
    },
    {
      provide: ActivateUserUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (userRepo: UserRepository) => {
        return new ActivateUserUseCase(userRepo);
      },
    },
    {
      provide: DeactivateUserUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (userRepo: UserRepository) => {
        return new DeactivateUserUseCase(userRepo);
      },
    },
    {
      provide: ChangeUserRoleUseCase,
      inject: [USER_REPOSITORY],
      useFactory: (userRepo: UserRepository) => {
        return new ChangeUserRoleUseCase(userRepo);
      },
    },
  ],
  exports: [
    CreateUserUseCase,
    GetUsersUseCase,
    ActivateUserUseCase,
    DeactivateUserUseCase,
    ChangeUserRoleUseCase,
  ],
})
export class UsersModule {}
