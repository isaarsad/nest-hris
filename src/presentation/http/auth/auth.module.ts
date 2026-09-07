import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain Layer (Ports & Repositories)
import { UserRepository } from '../../../domain/users/user.repository.js';
import { RefreshTokenRepository } from '../../../domain/auth/refresh-token.repository.js';
import { PasswordHasher } from '../../../domain/users/ports/password-hasher.port.js';
import { AccessTokenPort } from '../../../domain/auth/ports/access-token.port.js';
import { RefreshTokenPort } from '../../../domain/auth/ports/refresh-token.port.js';
import { IdGeneratorPort } from '../../../domain/shared/ports/id-generator.port.js';

// Application Layer (Use Cases)
import { LoginUseCase } from '../../../application/auth/login.use-case.js';
import { RefreshTokenUseCase } from '../../../application/auth/refresh-token.use-case.js';
import { LogoutUseCase } from '../../../application/auth/logout.use-case.js';
import { RevokeUserSessionsUseCase } from '../../../application/auth/revoke-user-sessions.use-case.js';
import { DeleteExpiredTokensUseCase } from '../../../application/auth/delete-expired-tokens.use-case.js';

// Infrastructure Layer (Entities & Implementations)
import { UserOrmEntity } from '../../../infrastructure/database/entities/user.orm-entity.js';
import { RefreshTokenOrmEntity } from '../../../infrastructure/database/entities/refresh-token.orm-entity.js';
import { TypeOrmUserRepository } from '../../../infrastructure/repositories/typeorm-user.repository.js';
import { TypeOrmRefreshTokenRepository } from '../../../infrastructure/repositories/typeorm-refresh-token.repository.js';
import { Argon2PasswordHasher } from '../../../infrastructure/security/argon2-password-hasher.js';
import { JwtAccessToken } from '../../../infrastructure/security/jwt-access-token.js';
import { CryptoRefreshToken } from '../../../infrastructure/security/crypto-refresh-token.js';
import { UuidGenerator } from '../../../infrastructure/utils/uuid-generator.js';
import { TokenCleanupTask } from '../../cron/token-cleanup.task.js';

// Presentation Layer (Controller & Guards)
import { AuthController } from './auth.controller.js';
import { ACCESS_TOKEN_PORT } from '../guards/auth.guard.js';

// config
import { config } from '../../../infrastructure/config/index.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const REFRESH_TOKEN_PORT = Symbol('REFRESH_TOKEN_PORT');
export const ID_GENERATOR = Symbol('ID_GENERATOR');

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity, RefreshTokenOrmEntity])],
  controllers: [AuthController],
  providers: [
    // Repositories & Adapters
    {
      provide: ID_GENERATOR,
      useClass: UuidGenerator,
    },
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: TypeOrmRefreshTokenRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasher,
    },
    {
      provide: ACCESS_TOKEN_PORT,
      useClass: JwtAccessToken,
    },
    {
      provide: REFRESH_TOKEN_PORT,
      useClass: CryptoRefreshToken,
    },

    // Use Cases
    {
      provide: LoginUseCase,
      inject: [
        USER_REPOSITORY,
        REFRESH_TOKEN_REPOSITORY,
        ID_GENERATOR,
        PASSWORD_HASHER,
        ACCESS_TOKEN_PORT,
        REFRESH_TOKEN_PORT,
      ],
      useFactory: (
        userRepo: UserRepository,
        refreshTokenRepo: RefreshTokenRepository,
        idGenerator: IdGeneratorPort,
        passwordHasher: PasswordHasher,
        accessTokenPort: AccessTokenPort,
        refreshTokenPort: RefreshTokenPort,
      ) => {
        return new LoginUseCase(
          userRepo,
          refreshTokenRepo,
          idGenerator,
          passwordHasher,
          accessTokenPort,
          refreshTokenPort,
        );
      },
    },
    {
      provide: RefreshTokenUseCase,
      inject: [
        USER_REPOSITORY,
        REFRESH_TOKEN_REPOSITORY,
        ID_GENERATOR,
        ACCESS_TOKEN_PORT,
        REFRESH_TOKEN_PORT,
      ],
      useFactory: (
        userRepo: UserRepository,
        refreshTokenRepo: RefreshTokenRepository,
        idGenerator: IdGeneratorPort,
        accessTokenPort: AccessTokenPort,
        refreshTokenPort: RefreshTokenPort,
      ) => {
        return new RefreshTokenUseCase(
          userRepo,
          refreshTokenRepo,
          idGenerator,
          accessTokenPort,
          refreshTokenPort,
          config.auth.refreshToken.concurrencyLeewayMs,
        );
      },
    },
    {
      provide: LogoutUseCase,
      inject: [REFRESH_TOKEN_REPOSITORY, REFRESH_TOKEN_PORT],
      useFactory: (
        refreshTokenRepo: RefreshTokenRepository,
        refreshTokenPort: RefreshTokenPort,
      ) => {
        return new LogoutUseCase(refreshTokenRepo, refreshTokenPort);
      },
    },
    {
      provide: RevokeUserSessionsUseCase,
      inject: [REFRESH_TOKEN_REPOSITORY, USER_REPOSITORY],
      useFactory: (
        refreshTokenRepo: RefreshTokenRepository,
        userRepo: UserRepository,
      ) => {
        return new RevokeUserSessionsUseCase(refreshTokenRepo, userRepo);
      },
    },
    {
      provide: DeleteExpiredTokensUseCase,
      inject: [REFRESH_TOKEN_REPOSITORY],
      useFactory: (refreshTokenRepo: RefreshTokenRepository) => {
        return new DeleteExpiredTokensUseCase(refreshTokenRepo);
      },
    },
    TokenCleanupTask,
  ],
  exports: [
    ACCESS_TOKEN_PORT,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RevokeUserSessionsUseCase,
    DeleteExpiredTokensUseCase,
  ],
})
export class AuthModule {}
