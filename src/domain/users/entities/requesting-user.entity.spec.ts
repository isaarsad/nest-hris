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
  });
});
