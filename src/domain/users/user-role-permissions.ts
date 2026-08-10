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
  DEACTIVATE_USER = 'deactivate:user',
  ACTIVATE_USER = 'activate:user',
  DELETE_USER = 'delete:user',
  RESTORE_USER = 'restore:user',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ROOT]: 40,
  [UserRole.ADMIN]: 30,
  [UserRole.HR]: 20,
  [UserRole.EMPLOYEE]: 10,
};

export const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  [UserRole.ROOT]: [
    UserPermission.VIEW_INACTIVE_DATA,
    UserPermission.VIEW_DELETED_DATA,
    UserPermission.CREATE_DEPARTMENT,
    UserPermission.CREATE_USER,
    UserPermission.UPDATE_USER_ROLE,
    UserPermission.DEACTIVATE_USER,
    UserPermission.ACTIVATE_USER,
    UserPermission.DELETE_USER,
    UserPermission.RESTORE_USER,
  ],
  [UserRole.ADMIN]: [
    UserPermission.VIEW_INACTIVE_DATA,
    UserPermission.CREATE_DEPARTMENT,
    UserPermission.CREATE_USER,
    UserPermission.UPDATE_USER_ROLE,
    UserPermission.DEACTIVATE_USER,
    UserPermission.ACTIVATE_USER,
    UserPermission.RESTORE_USER,
  ],
  [UserRole.HR]: [
    UserPermission.VIEW_INACTIVE_DATA,
    UserPermission.CREATE_USER,
    UserPermission.DEACTIVATE_USER,
    UserPermission.ACTIVATE_USER,
  ],
  [UserRole.EMPLOYEE]: [],
};
