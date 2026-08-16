export enum UserRole {
  ROOT = 'ROOT',
  ADMIN = 'ADMIN',
  HR = 'HR',
  EMPLOYEE = 'EMPLOYEE',
}

export enum UserPermission {
  VIEW_INACTIVE_DEPARTMENTS = 'view:inactive-departments',
  VIEW_DELETED_DEPARTMENTS = 'view:deleted-departments',
  CREATE_DEPARTMENT = 'create:department',
  CREATE_USER = 'create:user',
  UPDATE_USER_ROLE = 'update:user-role',
  DEACTIVATE_USER = 'deactivate:user',
  ACTIVATE_USER = 'activate:user',
  DELETE_USER = 'delete:user',
  RESTORE_USER = 'restore:user',
  VIEW_USERS = 'view:users',
  VIEW_INACTIVE_USERS = 'view:inactive-users',
  VIEW_DELETED_USERS = 'view:deleted-users',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ROOT]: 40,
  [UserRole.ADMIN]: 30,
  [UserRole.HR]: 20,
  [UserRole.EMPLOYEE]: 10,
};

export const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  [UserRole.ROOT]: [
    UserPermission.VIEW_INACTIVE_DEPARTMENTS,
    UserPermission.VIEW_DELETED_DEPARTMENTS,
    UserPermission.CREATE_DEPARTMENT,
    UserPermission.CREATE_USER,
    UserPermission.UPDATE_USER_ROLE,
    UserPermission.DEACTIVATE_USER,
    UserPermission.ACTIVATE_USER,
    UserPermission.DELETE_USER,
    UserPermission.RESTORE_USER,
    UserPermission.VIEW_USERS,
    UserPermission.VIEW_INACTIVE_USERS,
    UserPermission.VIEW_DELETED_USERS,
  ],
  [UserRole.ADMIN]: [
    UserPermission.VIEW_INACTIVE_DEPARTMENTS,
    UserPermission.CREATE_DEPARTMENT,
    UserPermission.CREATE_USER,
    UserPermission.UPDATE_USER_ROLE,
    UserPermission.DEACTIVATE_USER,
    UserPermission.ACTIVATE_USER,
    UserPermission.RESTORE_USER,
    UserPermission.VIEW_USERS,
    UserPermission.VIEW_INACTIVE_USERS,
    UserPermission.VIEW_DELETED_USERS,
  ],
  [UserRole.HR]: [
    UserPermission.VIEW_INACTIVE_DEPARTMENTS,
    UserPermission.CREATE_USER,
    UserPermission.DEACTIVATE_USER,
    UserPermission.ACTIVATE_USER,
    UserPermission.VIEW_USERS,
    UserPermission.VIEW_INACTIVE_USERS,
  ],
  [UserRole.EMPLOYEE]: [],
};
