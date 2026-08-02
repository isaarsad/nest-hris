import {
  UserRole,
  UserPermission,
  ROLE_PERMISSIONS,
} from '../user-role-permissions.js';

export class RequestingUser {
  constructor(
    public readonly id: string,
    public readonly role: UserRole,
  ) {}

  hasPermission(permission: UserPermission): boolean {
    const permissions = ROLE_PERMISSIONS[this.role];
    return permissions.includes(permission);
  }
}
