import {
  UserRole,
  UserPermission,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
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

  canAssignRole(targetRole: UserRole): boolean {
    if (this.role === UserRole.ROOT) {
      return true;
    }

    const myRank = ROLE_HIERARCHY[this.role];
    const targetRank = ROLE_HIERARCHY[targetRole];

    return myRank > targetRank;
  }
}
