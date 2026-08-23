import { RefreshToken } from '../../domain/auth/entities/refresh-token.entity.js';
import {
  InvalidCredentialsError,
  UserInactiveError,
} from '../../domain/auth/errors/index.js';
import { RefreshTokenRepository } from '../../domain/auth/refresh-token.repository.js';
import { IdGeneratorPort } from '../../domain/shared/ports/id-generator.port.js';
import { PasswordHasher } from '../../domain/users/ports/password-hasher.port.js';
import { AccessTokenPort } from '../../domain/auth/ports/access-token.port.js';
import { RefreshTokenPort } from '../../domain/auth/ports/refresh-token.port.js';
import { Email } from '../../domain/shared/value-objects/email.vo.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { PasswordHash } from '../../domain/shared/value-objects/password-hash.vo.js';

export interface LoginCommand {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly username: string;
    readonly role: string;
  };
}

const DUMMY_PASSWORD_HASH = new PasswordHash(
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$RdescudvJCsgt3ub+b+dWRWJTmaaJObG',
);

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly idGenerator: IdGeneratorPort,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenPort: AccessTokenPort,
    private readonly refreshTokenPort: RefreshTokenPort,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = new Email(command.email);
    const user = await this.userRepository.findByEmail(email);

    const isPasswordValid = await this.passwordHasher.compare(
      command.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    // isPasswordValid is computed first (even if the user is null) to prevent timing attacks.
    if (!user || user.isDeleted() || !isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    const accessToken = await this.accessTokenPort.generate({
      sub: user.id,
      role: user.role,
    });

    const rawRefreshToken = this.refreshTokenPort.generate();
    const tokenHash = this.refreshTokenPort.hash(rawRefreshToken);
    const expiresAt = this.refreshTokenPort.getExpiresAt();
    const absoluteExpiresAt = this.refreshTokenPort.getAbsoluteExpiresAt();

    const refreshTokenEntity = RefreshToken.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      tokenHash,
      expiresAt,
      absoluteExpiresAt,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email.value,
        username: user.username.value,
        role: user.role,
      },
    };
  }
}
