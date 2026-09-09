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
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  createdAt: Date;
}

export interface RotateRefreshTokenResult {
  revokedOldToken: RefreshToken;
  newToken: RefreshToken;
}

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

export class RefreshToken {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly createdAt: Date;

  private _revokedAt: Date | null;
  private _replacedByTokenId: string | null;

  constructor(props: RefreshTokenProps) {
    this.validate(props);

    this.id = props.id.trim();
    this.userId = props.userId.trim();
    this.tokenHash = props.tokenHash.trim();
    this.expiresAt = props.expiresAt;
    this.absoluteExpiresAt = props.absoluteExpiresAt;
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
    absoluteExpiresAt: Date;
  }): RefreshToken {
    return new RefreshToken({
      id: props.id,
      userId: props.userId,
      tokenHash: props.tokenHash,
      expiresAt: props.expiresAt,
      absoluteExpiresAt: props.absoluteExpiresAt,
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

  rotate(props: {
    newId: string;
    newTokenHash: string;
    expiresAt: Date;
  }): RotateRefreshTokenResult {
    const now = new Date();

    if (this.isRevoked()) {
      throw new RefreshTokenInconsistentStateError(
        'Cannot rotate an already revoked refresh token',
      );
    }

    if (this.isExpired(now)) {
      throw new RefreshTokenInconsistentStateError(
        'Cannot rotate an expired refresh token',
      );
    }

    this.revoke(props.newId);

    const newExpiresAt =
      props.expiresAt.getTime() > this.absoluteExpiresAt.getTime()
        ? this.absoluteExpiresAt
        : props.expiresAt;

    const newToken = new RefreshToken({
      id: props.newId,
      userId: this.userId,
      tokenHash: props.newTokenHash,
      expiresAt: newExpiresAt,
      absoluteExpiresAt: this.absoluteExpiresAt,
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: now,
    });

    return { revokedOldToken: this, newToken };
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
      absoluteExpiresAt,
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

    const isValidDate = (d: unknown): d is Date =>
      d instanceof Date && !isNaN(d.getTime());

    if (
      !isValidDate(expiresAt) ||
      !isValidDate(absoluteExpiresAt) ||
      !isValidDate(createdAt)
    ) {
      throw new RefreshTokenInvalidPayloadError(
        'expiresAt, absoluteExpiresAt, and createdAt must be valid Date objects',
      );
    }

    if (expiresAt.getTime() <= createdAt.getTime()) {
      throw new RefreshTokenInconsistentStateError(
        `expiresAt (${expiresAt.toISOString()}) must be later than createdAt (${createdAt.toISOString()})`,
      );
    }

    if (absoluteExpiresAt.getTime() <= createdAt.getTime()) {
      throw new RefreshTokenInconsistentStateError(
        `absoluteExpiresAt (${absoluteExpiresAt.toISOString()}) must be later than createdAt (${createdAt.toISOString()})`,
      );
    }

    if (expiresAt.getTime() > absoluteExpiresAt.getTime()) {
      throw new RefreshTokenInconsistentStateError(
        `expiresAt (${expiresAt.toISOString()}) cannot be later than absoluteExpiresAt (${absoluteExpiresAt.toISOString()})`,
      );
    }

    if (revokedAt !== null) {
      if (!isValidDate(revokedAt)) {
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
