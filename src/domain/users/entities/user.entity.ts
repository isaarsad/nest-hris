import {
  UserInvalidPayloadError,
  UserAlreadyDeletedError,
  UserAlreadyInactiveError,
  UserAlreadyActiveError,
  UserNotDeletedError,
  UserInconsistentStateError,
  UserRoleUnchangedError,
} from '../errors/index.js';
import { UserRole } from '../user-role-permissions.js';
import {
  Email,
  PasswordHash,
  Username,
} from '../../shared/value-objects/index.js';

export interface UserProps {
  id: string;
  username: Username;
  email: Email;
  passwordHash: PasswordHash;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class User {
  readonly id: string;
  readonly createdAt: Date;

  private _username: Username;
  private _email: Email;
  private _passwordHash: PasswordHash;
  private _role: UserRole;
  private _isActive: boolean;
  private _updatedAt: Date;
  private _deletedAt: Date | null;

  constructor(props: UserProps) {
    this.validate(props);

    this.id = props.id.trim();
    this._username = props.username;
    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._isActive = props.isActive;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._deletedAt = props.deletedAt;
  }

  get username(): Username {
    return this._username;
  }
  get email(): Email {
    return this._email;
  }
  get passwordHash(): PasswordHash {
    return this._passwordHash;
  }
  get role(): UserRole {
    return this._role;
  }
  get isActive(): boolean {
    return this._isActive;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  static create(props: {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
  }): User {
    const now = new Date();
    return new User({
      id: props.id,
      username: new Username(props.username),
      email: new Email(props.email),
      passwordHash: new PasswordHash(props.passwordHash),
      role: props.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  changeRole(newRole: UserRole): void {
    this.ensureNotDeleted();
    if (this._role === newRole) {
      throw new UserRoleUnchangedError(
        this._username.value,
        this.id,
        this._role,
      );
    }
    this._role = newRole;
    this.touch();
  }

  deactivate(): void {
    this.ensureNotDeleted();
    if (!this._isActive) {
      throw new UserAlreadyInactiveError(this._username.value, this.id);
    }
    this._isActive = false;
    this.touch();
  }

  activate(): void {
    this.ensureNotDeleted();
    if (this._isActive) {
      throw new UserAlreadyActiveError(this._username.value, this.id);
    }
    this._isActive = true;
    this.touch();
  }

  softDelete(): void {
    this.ensureNotDeleted();
    this._isActive = false;
    this._deletedAt = new Date();
    this.touch();
  }

  restore(): void {
    if (this._deletedAt === null) {
      throw new UserNotDeletedError(this._username.value, this.id);
    }

    this._isActive = true;
    this._deletedAt = null;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private ensureNotDeleted(): void {
    if (this._deletedAt !== null) {
      throw new UserAlreadyDeletedError(this._username.value, this.id);
    }
  }

  private validate(props: UserProps) {
    const {
      id,
      username,
      email,
      passwordHash,
      role,
      isActive,
      createdAt,
      updatedAt,
      deletedAt,
    } = props;

    if (
      typeof id !== 'string' ||
      !id.trim() ||
      !(username instanceof Username) ||
      !(email instanceof Email) ||
      !(passwordHash instanceof PasswordHash) ||
      !role
    ) {
      throw new UserInvalidPayloadError();
    }

    if (deletedAt !== null && isActive) {
      throw new UserInconsistentStateError(
        username.value,
        id,
        'cannot be active while having a deletedAt timestamp',
      );
    }

    if (deletedAt !== null && deletedAt.getTime() < createdAt.getTime()) {
      throw new UserInconsistentStateError(
        username.value,
        id,
        `deletedAt (${deletedAt.toISOString()}) cannot be earlier than createdAt (${createdAt.toISOString()})`,
      );
    }

    if (updatedAt.getTime() < createdAt.getTime()) {
      throw new UserInconsistentStateError(
        username.value,
        id,
        `updatedAt (${updatedAt.toISOString()}) cannot be earlier than createdAt (${createdAt.toISOString()})`,
      );
    }
  }
}
