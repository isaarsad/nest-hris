import {
  UserRole,
  UserPermission,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
} from '../user-role-permissions.js';
import { InvalidUserRoleError } from '../errors/index.js';

export class RequestingUser {
  constructor(
    public readonly id: string,
    public readonly role: UserRole,
  ) {
    if (!role || !(role in ROLE_HIERARCHY)) {
      throw new InvalidUserRoleError(role);
    }
  }

  hasPermission(permission: UserPermission): boolean {
    const permissions = ROLE_PERMISSIONS[this.role];
    return permissions ? permissions.includes(permission) : false;
  }

  isSuperiorTo(targetRole: UserRole): boolean {
    if (this.role === UserRole.ROOT) return true;

    if (!targetRole || !(targetRole in ROLE_HIERARCHY)) return false;

    const userRank = ROLE_HIERARCHY[this.role];
    const targetRank = ROLE_HIERARCHY[targetRole];

    return userRank > targetRank;
  }

  canAssignRole(targetRole: UserRole): boolean {
    return this.isSuperiorTo(targetRole);
  }
}
