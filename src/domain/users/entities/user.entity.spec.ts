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
import { User, UserProps } from './user.entity.js';

describe('User entity', () => {
  const baseProps: UserProps = {
    id: 'user-001',
    username: new Username('john_doe'),
    email: new Email('john@example.com'),
    passwordHash: new PasswordHash('hashedpassword1234567890'),
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const buildUser = (overrides: Partial<UserProps> = {}): User =>
    new User({ ...baseProps, ...overrides });

  // === HAPPY PATH: constructor ===

  it('should create User correctly with valid props', () => {
    const user = buildUser();

    expect(user.id).toBe('user-001');
    expect(user.username).toBeInstanceOf(Username);
    expect(user.username.value).toBe('john_doe');
    expect(user.email).toBeInstanceOf(Email);
    expect(user.email.value).toBe('john@example.com');
    expect(user.passwordHash).toBeInstanceOf(PasswordHash);
    expect(user.passwordHash.value).toBe('hashedpassword1234567890');
    expect(user.role).toBe(UserRole.EMPLOYEE);
    expect(user.isActive).toBe(true);
    expect(user.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    expect(user.updatedAt).toEqual(new Date('2024-06-01T00:00:00.000Z'));
    expect(user.deletedAt).toBeNull();
  });

  it('should trim the id on construction', () => {
    const user = buildUser({ id: '  user-002  ' });
    expect(user.id).toBe('user-002');
  });

  it('should accept a soft-deleted user (isActive false, deletedAt set)', () => {
    const deletedAt = new Date('2024-12-01T00:00:00.000Z');
    const user = buildUser({ isActive: false, deletedAt });

    expect(user.isActive).toBe(false);
    expect(user.deletedAt).toEqual(deletedAt);
  });

  // === HAPPY PATH: static create() ===

  it('should create a new User via static create() with correct defaults', () => {
    const before = new Date();
    const user = User.create({
      id: 'user-100',
      username: 'jane_doe',
      email: 'jane@example.com',
      passwordHash: 'anothervalidhash12345',
      role: UserRole.ADMIN,
    });
    const after = new Date();

    expect(user.id).toBe('user-100');
    expect(user.username.value).toBe('jane_doe');
    expect(user.email.value).toBe('jane@example.com');
    expect(user.passwordHash.value).toBe('anothervalidhash12345');
    expect(user.role).toBe(UserRole.ADMIN);
    expect(user.isActive).toBe(true);
    expect(user.deletedAt).toBeNull();
    expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(user.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should set createdAt and updatedAt to the same timestamp via static create()', () => {
    const user = User.create({
      id: 'user-101',
      username: 'mike_smith',
      email: 'mike@example.com',
      passwordHash: 'validhashpassword12345',
      role: UserRole.HR,
    });

    expect(user.createdAt.getTime()).toBe(user.updatedAt.getTime());
  });

  // === changeRole() ===

  it('should change the role of an active user', () => {
    const user = buildUser({ role: UserRole.EMPLOYEE });

    user.changeRole(UserRole.HR);

    expect(user.role).toBe(UserRole.HR);
  });

  it('should update updatedAt when role is changed', () => {
    const user = buildUser({ role: UserRole.EMPLOYEE });
    const prevUpdatedAt = user.updatedAt;

    user.changeRole(UserRole.ADMIN);

    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
      prevUpdatedAt.getTime(),
    );
  });

  it('should throw UserRoleUnchangedError when new role is the same as current', () => {
    const user = buildUser({ role: UserRole.EMPLOYEE });

    expect(() => user.changeRole(UserRole.EMPLOYEE)).toThrow(
      UserRoleUnchangedError,
    );
  });

  it('should throw UserAlreadyDeletedError when changing role on a deleted user', () => {
    const user = buildUser({
      isActive: false,
      deletedAt: new Date('2024-11-01T00:00:00.000Z'),
    });

    expect(() => user.changeRole(UserRole.ADMIN)).toThrow(
      UserAlreadyDeletedError,
    );
  });

  // === deactivate() ===

  it('should deactivate an active user', () => {
    const user = buildUser({ isActive: true });

    user.deactivate();

    expect(user.isActive).toBe(false);
  });

  it('should update updatedAt when deactivated', () => {
    const user = buildUser({ isActive: true });
    const prevUpdatedAt = user.updatedAt;

    user.deactivate();

    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
      prevUpdatedAt.getTime(),
    );
  });

  it('should throw UserAlreadyInactiveError when deactivating an already inactive user', () => {
    const user = buildUser({ isActive: false });

    expect(() => user.deactivate()).toThrow(UserAlreadyInactiveError);
  });

  it('should throw UserAlreadyDeletedError when deactivating a deleted user', () => {
    const user = buildUser({
      isActive: false,
      deletedAt: new Date('2024-11-01T00:00:00.000Z'),
    });

    expect(() => user.deactivate()).toThrow(UserAlreadyDeletedError);
  });

  // === activate() ===

  it('should activate an inactive user', () => {
    const user = buildUser({ isActive: false });

    user.activate();

    expect(user.isActive).toBe(true);
  });

  it('should update updatedAt when activated', () => {
    const user = buildUser({ isActive: false });
    const prevUpdatedAt = user.updatedAt;

    user.activate();

    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
      prevUpdatedAt.getTime(),
    );
  });

  it('should throw UserAlreadyActiveError when activating an already active user', () => {
    const user = buildUser({ isActive: true });

    expect(() => user.activate()).toThrow(UserAlreadyActiveError);
  });

  it('should throw UserAlreadyDeletedError when activating a deleted user', () => {
    const user = buildUser({
      isActive: false,
      deletedAt: new Date('2024-11-01T00:00:00.000Z'),
    });

    expect(() => user.activate()).toThrow(UserAlreadyDeletedError);
  });

  // === softDelete() ===

  it('should soft-delete an active user', () => {
    const user = buildUser({ isActive: true });
    const before = new Date();

    user.softDelete();

    expect(user.isActive).toBe(false);
    expect(user.deletedAt).toBeInstanceOf(Date);
    expect(user.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('should update updatedAt when soft-deleted', () => {
    const user = buildUser({ isActive: true });
    const prevUpdatedAt = user.updatedAt;

    user.softDelete();

    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
      prevUpdatedAt.getTime(),
    );
  });

  it('should throw UserAlreadyDeletedError when soft-deleting an already deleted user', () => {
    const user = buildUser({
      isActive: false,
      deletedAt: new Date('2024-11-01T00:00:00.000Z'),
    });

    expect(() => user.softDelete()).toThrow(UserAlreadyDeletedError);
  });

  // === restore() ===

  it('should restore a soft-deleted user', () => {
    const user = buildUser({
      isActive: false,
      deletedAt: new Date('2024-11-01T00:00:00.000Z'),
    });

    user.restore();

    expect(user.isActive).toBe(true);
    expect(user.deletedAt).toBeNull();
  });

  it('should update updatedAt when restored', () => {
    const user = buildUser({
      isActive: false,
      deletedAt: new Date('2024-11-01T00:00:00.000Z'),
    });
    const prevUpdatedAt = user.updatedAt;

    user.restore();

    expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
      prevUpdatedAt.getTime(),
    );
  });

  it('should throw UserNotDeletedError when restoring a non-deleted user', () => {
    const user = buildUser({ deletedAt: null });

    expect(() => user.restore()).toThrow(UserNotDeletedError);
  });

  // === VALIDATION: id ===

  it('should throw UserInvalidPayloadError when id is empty', () => {
    expect(() => buildUser({ id: '' })).toThrow(UserInvalidPayloadError);
  });

  it('should throw UserInvalidPayloadError when id is only whitespace', () => {
    expect(() => buildUser({ id: '   ' })).toThrow(UserInvalidPayloadError);
  });

  it('should throw UserInvalidPayloadError when id is not a string', () => {
    expect(() => buildUser({ id: 123 as unknown as string })).toThrow(
      UserInvalidPayloadError,
    );
  });

  // === VALIDATION: username ===

  it('should throw UserInvalidPayloadError when username is not a Username instance', () => {
    expect(() =>
      buildUser({ username: 'plain_string' as unknown as Username }),
    ).toThrow(UserInvalidPayloadError);
  });

  // === VALIDATION: email ===

  it('should throw UserInvalidPayloadError when email is not an Email instance', () => {
    expect(() =>
      buildUser({ email: 'plain@string.com' as unknown as Email }),
    ).toThrow(UserInvalidPayloadError);
  });

  // === VALIDATION: passwordHash ===

  it('should throw UserInvalidPayloadError when passwordHash is not a PasswordHash instance', () => {
    expect(() =>
      buildUser({ passwordHash: 'somehash' as unknown as PasswordHash }),
    ).toThrow(UserInvalidPayloadError);
  });

  // === VALIDATION: role ===

  it('should throw UserInvalidPayloadError when role is falsy', () => {
    expect(() => buildUser({ role: '' as unknown as UserRole })).toThrow(
      UserInvalidPayloadError,
    );
  });

  // === VALIDATION: inconsistent state – active + deletedAt ===

  it('should throw UserInconsistentStateError when isActive is true but deletedAt is set', () => {
    expect(() =>
      buildUser({
        isActive: true,
        deletedAt: new Date('2024-11-01T00:00:00.000Z'),
      }),
    ).toThrow(UserInconsistentStateError);
  });

  // === VALIDATION: inconsistent state – deletedAt before createdAt ===

  it('should throw UserInconsistentStateError when deletedAt is earlier than createdAt', () => {
    expect(() =>
      buildUser({
        isActive: false,
        createdAt: new Date('2024-06-01T00:00:00.000Z'),
        deletedAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).toThrow(UserInconsistentStateError);
  });

  // === VALIDATION: inconsistent state – updatedAt before createdAt ===

  it('should throw UserInconsistentStateError when updatedAt is earlier than createdAt', () => {
    expect(() =>
      buildUser({
        createdAt: new Date('2024-06-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      }),
    ).toThrow(UserInconsistentStateError);
  });
});
