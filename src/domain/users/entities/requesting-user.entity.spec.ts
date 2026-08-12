import { RequestingUser } from './requesting-user.entity.js';
import { UserRole, UserPermission } from '../user-role-permissions.js';

describe('RequestingUser entity', () => {
  // === CONSTRUCTOR ===

  it('should create RequestingUser with the given id and role', () => {
    const user = new RequestingUser('user-001', UserRole.ADMIN);

    expect(user.id).toBe('user-001');
    expect(user.role).toBe(UserRole.ADMIN);
  });

  it('should expose id and role as readonly properties', () => {
    const user = new RequestingUser('user-002', UserRole.HR);

    expect(user.id).toBe('user-002');
    expect(user.role).toBe(UserRole.HR);
  });

  // === hasPermission: ROOT ===

  describe('ROOT role', () => {
    const root = new RequestingUser('root-001', UserRole.ROOT);

    it('should have VIEW_INACTIVE_DEPARTMENTS permission', () => {
      expect(root.hasPermission(UserPermission.VIEW_INACTIVE_DEPARTMENTS)).toBe(
        true,
      );
    });

    it('should have VIEW_DELETED_DEPARTMENTS permission', () => {
      expect(root.hasPermission(UserPermission.VIEW_DELETED_DEPARTMENTS)).toBe(
        true,
      );
    });

    it('should have CREATE_DEPARTMENT permission', () => {
      expect(root.hasPermission(UserPermission.CREATE_DEPARTMENT)).toBe(true);
    });

    it('should have CREATE_USER permission', () => {
      expect(root.hasPermission(UserPermission.CREATE_USER)).toBe(true);
    });

    it('should have UPDATE_USER_ROLE permission', () => {
      expect(root.hasPermission(UserPermission.UPDATE_USER_ROLE)).toBe(true);
    });

    it('should have DEACTIVATE_USER permission', () => {
      expect(root.hasPermission(UserPermission.DEACTIVATE_USER)).toBe(true);
    });

    it('should have ACTIVATE_USER permission', () => {
      expect(root.hasPermission(UserPermission.ACTIVATE_USER)).toBe(true);
    });

    it('should have DELETE_USER permission', () => {
      expect(root.hasPermission(UserPermission.DELETE_USER)).toBe(true);
    });

    it('should have RESTORE_USER permission', () => {
      expect(root.hasPermission(UserPermission.RESTORE_USER)).toBe(true);
    });

    it('should have VIEW_USERS permission', () => {
      expect(root.hasPermission(UserPermission.VIEW_USERS)).toBe(true);
    });

    it('should have VIEW_INACTIVE_USERS permission', () => {
      expect(root.hasPermission(UserPermission.VIEW_INACTIVE_USERS)).toBe(true);
    });

    it('should have VIEW_DELETED_USERS permission', () => {
      expect(root.hasPermission(UserPermission.VIEW_DELETED_USERS)).toBe(true);
    });
  });

  // === hasPermission: ADMIN ===

  describe('ADMIN role', () => {
    const admin = new RequestingUser('admin-001', UserRole.ADMIN);

    it('should have VIEW_INACTIVE_DEPARTMENTS permission', () => {
      expect(
        admin.hasPermission(UserPermission.VIEW_INACTIVE_DEPARTMENTS),
      ).toBe(true);
    });

    it('should NOT have VIEW_DELETED_DEPARTMENTS permission', () => {
      expect(admin.hasPermission(UserPermission.VIEW_DELETED_DEPARTMENTS)).toBe(
        false,
      );
    });

    it('should have CREATE_DEPARTMENT permission', () => {
      expect(admin.hasPermission(UserPermission.CREATE_DEPARTMENT)).toBe(true);
    });

    it('should have CREATE_USER permission', () => {
      expect(admin.hasPermission(UserPermission.CREATE_USER)).toBe(true);
    });

    it('should have UPDATE_USER_ROLE permission', () => {
      expect(admin.hasPermission(UserPermission.UPDATE_USER_ROLE)).toBe(true);
    });

    it('should have DEACTIVATE_USER permission', () => {
      expect(admin.hasPermission(UserPermission.DEACTIVATE_USER)).toBe(true);
    });

    it('should have ACTIVATE_USER permission', () => {
      expect(admin.hasPermission(UserPermission.ACTIVATE_USER)).toBe(true);
    });

    it('should NOT have DELETE_USER permission', () => {
      expect(admin.hasPermission(UserPermission.DELETE_USER)).toBe(false);
    });

    it('should have RESTORE_USER permission', () => {
      expect(admin.hasPermission(UserPermission.RESTORE_USER)).toBe(true);
    });

    it('should have VIEW_USERS permission', () => {
      expect(admin.hasPermission(UserPermission.VIEW_USERS)).toBe(true);
    });

    it('should have VIEW_INACTIVE_USERS permission', () => {
      expect(admin.hasPermission(UserPermission.VIEW_INACTIVE_USERS)).toBe(
        true,
      );
    });

    it('should have VIEW_DELETED_USERS permission', () => {
      expect(admin.hasPermission(UserPermission.VIEW_DELETED_USERS)).toBe(true);
    });
  });

  // === hasPermission: HR ===

  describe('HR role', () => {
    const hr = new RequestingUser('hr-001', UserRole.HR);

    it('should have VIEW_INACTIVE_DEPARTMENTS permission', () => {
      expect(hr.hasPermission(UserPermission.VIEW_INACTIVE_DEPARTMENTS)).toBe(
        true,
      );
    });

    it('should NOT have VIEW_DELETED_DEPARTMENTS permission', () => {
      expect(hr.hasPermission(UserPermission.VIEW_DELETED_DEPARTMENTS)).toBe(
        false,
      );
    });

    it('should NOT have CREATE_DEPARTMENT permission', () => {
      expect(hr.hasPermission(UserPermission.CREATE_DEPARTMENT)).toBe(false);
    });

    it('should have CREATE_USER permission', () => {
      expect(hr.hasPermission(UserPermission.CREATE_USER)).toBe(true);
    });

    it('should NOT have UPDATE_USER_ROLE permission', () => {
      expect(hr.hasPermission(UserPermission.UPDATE_USER_ROLE)).toBe(false);
    });

    it('should have DEACTIVATE_USER permission', () => {
      expect(hr.hasPermission(UserPermission.DEACTIVATE_USER)).toBe(true);
    });

    it('should have ACTIVATE_USER permission', () => {
      expect(hr.hasPermission(UserPermission.ACTIVATE_USER)).toBe(true);
    });

    it('should NOT have DELETE_USER permission', () => {
      expect(hr.hasPermission(UserPermission.DELETE_USER)).toBe(false);
    });

    it('should NOT have RESTORE_USER permission', () => {
      expect(hr.hasPermission(UserPermission.RESTORE_USER)).toBe(false);
    });

    it('should have VIEW_USERS permission', () => {
      expect(hr.hasPermission(UserPermission.VIEW_USERS)).toBe(true);
    });

    it('should have VIEW_INACTIVE_USERS permission', () => {
      expect(hr.hasPermission(UserPermission.VIEW_INACTIVE_USERS)).toBe(true);
    });

    it('should NOT have VIEW_DELETED_USERS permission', () => {
      expect(hr.hasPermission(UserPermission.VIEW_DELETED_USERS)).toBe(false);
    });
  });

  // === hasPermission: EMPLOYEE ===

  describe('EMPLOYEE role', () => {
    const employee = new RequestingUser('emp-001', UserRole.EMPLOYEE);

    it('should NOT have VIEW_INACTIVE_DEPARTMENTS permission', () => {
      expect(
        employee.hasPermission(UserPermission.VIEW_INACTIVE_DEPARTMENTS),
      ).toBe(false);
    });

    it('should NOT have VIEW_DELETED_DEPARTMENTS permission', () => {
      expect(
        employee.hasPermission(UserPermission.VIEW_DELETED_DEPARTMENTS),
      ).toBe(false);
    });

    it('should NOT have CREATE_DEPARTMENT permission', () => {
      expect(employee.hasPermission(UserPermission.CREATE_DEPARTMENT)).toBe(
        false,
      );
    });

    it('should NOT have CREATE_USER permission', () => {
      expect(employee.hasPermission(UserPermission.CREATE_USER)).toBe(false);
    });

    it('should NOT have UPDATE_USER_ROLE permission', () => {
      expect(employee.hasPermission(UserPermission.UPDATE_USER_ROLE)).toBe(
        false,
      );
    });

    it('should NOT have DEACTIVATE_USER permission', () => {
      expect(employee.hasPermission(UserPermission.DEACTIVATE_USER)).toBe(
        false,
      );
    });

    it('should NOT have ACTIVATE_USER permission', () => {
      expect(employee.hasPermission(UserPermission.ACTIVATE_USER)).toBe(false);
    });

    it('should NOT have DELETE_USER permission', () => {
      expect(employee.hasPermission(UserPermission.DELETE_USER)).toBe(false);
    });

    it('should NOT have RESTORE_USER permission', () => {
      expect(employee.hasPermission(UserPermission.RESTORE_USER)).toBe(false);
    });

    it('should NOT have VIEW_USERS permission', () => {
      expect(employee.hasPermission(UserPermission.VIEW_USERS)).toBe(false);
    });

    it('should NOT have VIEW_INACTIVE_USERS permission', () => {
      expect(employee.hasPermission(UserPermission.VIEW_INACTIVE_USERS)).toBe(
        false,
      );
    });

    it('should NOT have VIEW_DELETED_USERS permission', () => {
      expect(employee.hasPermission(UserPermission.VIEW_DELETED_USERS)).toBe(
        false,
      );
    });
  });

  // === canAssignRole ===

  describe('canAssignRole', () => {
    describe('ROOT role', () => {
      const root = new RequestingUser('root-001', UserRole.ROOT);

      it('should be able to assign ROOT role', () => {
        expect(root.canAssignRole(UserRole.ROOT)).toBe(true);
      });

      it('should be able to assign ADMIN role', () => {
        expect(root.canAssignRole(UserRole.ADMIN)).toBe(true);
      });

      it('should be able to assign HR role', () => {
        expect(root.canAssignRole(UserRole.HR)).toBe(true);
      });

      it('should be able to assign EMPLOYEE role', () => {
        expect(root.canAssignRole(UserRole.EMPLOYEE)).toBe(true);
      });
    });

    describe('ADMIN role', () => {
      const admin = new RequestingUser('admin-001', UserRole.ADMIN);

      it('should NOT be able to assign ROOT role', () => {
        expect(admin.canAssignRole(UserRole.ROOT)).toBe(false);
      });

      it('should NOT be able to assign ADMIN role (same rank)', () => {
        expect(admin.canAssignRole(UserRole.ADMIN)).toBe(false);
      });

      it('should be able to assign HR role', () => {
        expect(admin.canAssignRole(UserRole.HR)).toBe(true);
      });

      it('should be able to assign EMPLOYEE role', () => {
        expect(admin.canAssignRole(UserRole.EMPLOYEE)).toBe(true);
      });
    });

    describe('HR role', () => {
      const hr = new RequestingUser('hr-001', UserRole.HR);

      it('should NOT be able to assign ROOT role', () => {
        expect(hr.canAssignRole(UserRole.ROOT)).toBe(false);
      });

      it('should NOT be able to assign ADMIN role', () => {
        expect(hr.canAssignRole(UserRole.ADMIN)).toBe(false);
      });

      it('should NOT be able to assign HR role (same rank)', () => {
        expect(hr.canAssignRole(UserRole.HR)).toBe(false);
      });

      it('should be able to assign EMPLOYEE role', () => {
        expect(hr.canAssignRole(UserRole.EMPLOYEE)).toBe(true);
      });
    });

    describe('EMPLOYEE role', () => {
      const employee = new RequestingUser('emp-001', UserRole.EMPLOYEE);

      it('should NOT be able to assign ROOT role', () => {
        expect(employee.canAssignRole(UserRole.ROOT)).toBe(false);
      });

      it('should NOT be able to assign ADMIN role', () => {
        expect(employee.canAssignRole(UserRole.ADMIN)).toBe(false);
      });

      it('should NOT be able to assign HR role', () => {
        expect(employee.canAssignRole(UserRole.HR)).toBe(false);
      });

      it('should NOT be able to assign EMPLOYEE role (same rank)', () => {
        expect(employee.canAssignRole(UserRole.EMPLOYEE)).toBe(false);
      });
    });
  });
});
