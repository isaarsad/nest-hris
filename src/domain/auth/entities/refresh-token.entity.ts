import {
  RefreshTokenInvalidPayloadError,
  RefreshTokenInvalidHashError,
  RefreshTokenInconsistentStateError,
} from '../errors/index.js';

export interface RefreshTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  createdAt: Date;
}

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

export class RefreshToken {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;

  private _revokedAt: Date | null;
  private _replacedByTokenId: string | null;

  constructor(props: RefreshTokenProps) {
    this.validate(props);

    this.id = props.id.trim();
    this.userId = props.userId.trim();
    this.tokenHash = props.tokenHash.trim();
    this.expiresAt = props.expiresAt;
    this._revokedAt = props.revokedAt;
    this._replacedByTokenId = props.replacedByTokenId
      ? props.replacedByTokenId.trim()
      : null;
    this.createdAt = props.createdAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  get replacedByTokenId(): string | null {
    return this._replacedByTokenId;
  }

  static create(props: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): RefreshToken {
    return new RefreshToken({
      id: props.id,
      userId: props.userId,
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
    });
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  isRevoked(): boolean {
    return this._revokedAt !== null;
  }

  isValid(now: Date = new Date()): boolean {
    return !this.isExpired(now) && !this.isRevoked();
  }

  revoke(replacedByTokenId?: string): void {
    if (this.isRevoked()) {
      return;
    }
    this._revokedAt = new Date();
    this._replacedByTokenId = replacedByTokenId
      ? replacedByTokenId.trim()
      : null;
  }

  wasReusedAfterRevocation(now: Date = new Date()): boolean {
    return this.isRevoked() && !this.isExpired(now);
  }

  equals(other: RefreshToken): boolean {
    return this.id === other.id;
  }

  private validate(props: RefreshTokenProps): void {
    const {
      id,
      userId,
      tokenHash,
      expiresAt,
      createdAt,
      revokedAt,
      replacedByTokenId,
    } = props;

    if (
      typeof id !== 'string' ||
      !id.trim() ||
      typeof userId !== 'string' ||
      !userId.trim()
    ) {
      throw new RefreshTokenInvalidPayloadError(
        'Refresh token must contain valid non-empty id and userId strings',
      );
    }

    if (
      typeof tokenHash !== 'string' ||
      !SHA256_HEX_REGEX.test(tokenHash.trim())
    ) {
      throw new RefreshTokenInvalidHashError();
    }

    if (!(expiresAt instanceof Date) || !(createdAt instanceof Date)) {
      throw new RefreshTokenInvalidPayloadError(
        'expiresAt and createdAt must be valid Date objects',
      );
    }

    if (expiresAt.getTime() <= createdAt.getTime()) {
      throw new RefreshTokenInconsistentStateError(
        `expiresAt (${expiresAt.toISOString()}) must be later than createdAt (${createdAt.toISOString()})`,
      );
    }

    if (revokedAt !== null) {
      if (!(revokedAt instanceof Date)) {
        throw new RefreshTokenInvalidPayloadError(
          'revokedAt must be a valid Date object or null',
        );
      }
      if (revokedAt.getTime() < createdAt.getTime()) {
        throw new RefreshTokenInconsistentStateError(
          `revokedAt (${revokedAt.toISOString()}) cannot be earlier than createdAt (${createdAt.toISOString()})`,
        );
      }
    }

    if (
      replacedByTokenId !== null &&
      (typeof replacedByTokenId !== 'string' || !replacedByTokenId.trim())
    ) {
      throw new RefreshTokenInvalidPayloadError(
        'replacedByTokenId must be a non-empty string or null',
      );
    }

    if (replacedByTokenId !== null && revokedAt === null) {
      throw new RefreshTokenInconsistentStateError(
        'replacedByTokenId can only be set when token is revoked',
      );
    }
  }
}
