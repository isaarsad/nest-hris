export enum UserRole {
  ROOT = 'ROOT',
  ADMIN = 'ADMIN',
  HR = 'HR',
  EMPLOYEE = 'EMPLOYEE',
}

export enum UserPermission {
  VIEW_INACTIVE_DATA = 'view:inactive-data',
  VIEW_DELETED_DATA = 'view:deleted-data',
  CREATE_DEPARTMENT = 'create:department',
  CREATE_USER = 'create:user',
  UPDATE_USER_ROLE = 'update:user-role',
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  [UserRole.ROOT]: [
    UserPermission.VIEW_INACTIVE_DATA,
    UserPermission.VIEW_DELETED_DATA,
    UserPermission.CREATE_DEPARTMENT,
    UserPermission.CREATE_USER,
    UserPermission.UPDATE_USER_ROLE,
  ],
  [UserRole.ADMIN]: [
    UserPermission.VIEW_INACTIVE_DATA,
    UserPermission.CREATE_DEPARTMENT,
    UserPermission.CREATE_USER,
    UserPermission.UPDATE_USER_ROLE,
  ],
  [UserRole.HR]: [
    UserPermission.VIEW_INACTIVE_DATA,
    UserPermission.CREATE_USER,
  ],
  [UserRole.EMPLOYEE]: [],
};
