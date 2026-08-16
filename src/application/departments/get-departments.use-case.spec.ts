import { GetDepartmentsUseCase } from './get-departments.use-case.js';
import { DepartmentRepository } from '../../domain/departments/department.repository.js';
import {
  Department,
  DepartmentProps,
} from '../../domain/departments/entities/department.entity.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const mockDepartmentRepository = (): DepartmentRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByParentId: vi.fn(),
  findAll: vi.fn(),
  existById: vi.fn(),
  existByName: vi.fn(),
  existByCode: vi.fn(),
});

const makeDepartment = (overrides: Partial<DepartmentProps> = {}): Department =>
  new Department({
    id: 'id-123',
    name: 'Engineering',
    code: 'ENG',
    parentDepartmentId: null,
    headEmployeeId: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  });

const makeRequestingUser = (role: UserRole): RequestingUser =>
  new RequestingUser('user-1', role);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetDepartmentsUseCase', () => {
  let departmentRepository: DepartmentRepository;
  let useCase: GetDepartmentsUseCase;

  beforeEach(() => {
    departmentRepository = mockDepartmentRepository();
    useCase = new GetDepartmentsUseCase(departmentRepository);
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  describe('execute - happy path', () => {
    it('should return an array of Department instances', async () => {
      const rawDepts = [
        makeDepartment({ id: 'id-1', name: 'Engineering', code: 'ENG' }),
        makeDepartment({ id: 'id-2', name: 'HR', code: 'HR' }),
      ];

      vi.mocked(departmentRepository.findAll).mockResolvedValue(rawDepts);

      const result = await useCase.execute(
        makeRequestingUser(UserRole.EMPLOYEE),
      );

      expect(result).toHaveLength(2);
      result.forEach((dept) => expect(dept).toBeInstanceOf(Department));
    });

    it('should return an empty array when no departments exist', async () => {
      vi.mocked(departmentRepository.findAll).mockResolvedValue([]);

      const result = await useCase.execute(
        makeRequestingUser(UserRole.EMPLOYEE),
      );

      expect(result).toEqual([]);
    });

    it('should return a single Department instance', async () => {
      const dept = makeDepartment();
      vi.mocked(departmentRepository.findAll).mockResolvedValue([dept]);

      const result = await useCase.execute(
        makeRequestingUser(UserRole.EMPLOYEE),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Department);
    });
  });

  // ── Permission: EMPLOYEE (no special permissions) ────────────────────────────

  describe('execute - EMPLOYEE role', () => {
    it('should call findAll with includeInactive=false and includeDeleted=false', async () => {
      vi.mocked(departmentRepository.findAll).mockResolvedValue([]);

      await useCase.execute(makeRequestingUser(UserRole.EMPLOYEE));

      expect(departmentRepository.findAll).toHaveBeenCalledWith({
        includeInactive: false,
        includeDeleted: false,
      });
    });
  });

  // ── Permission: HR (VIEW_INACTIVE_DEPARTMENTS only) ──────────────────────────────────

  describe('execute - HR role', () => {
    it('should call findAll with includeInactive=true and includeDeleted=false', async () => {
      vi.mocked(departmentRepository.findAll).mockResolvedValue([]);

      await useCase.execute(makeRequestingUser(UserRole.HR));

      expect(departmentRepository.findAll).toHaveBeenCalledWith({
        includeInactive: true,
        includeDeleted: false,
      });
    });
  });

  // ── Permission: ADMIN (VIEW_INACTIVE_DEPARTMENTS only) ───────────────────────────────

  describe('execute - ADMIN role', () => {
    it('should call findAll with includeInactive=true and includeDeleted=false', async () => {
      vi.mocked(departmentRepository.findAll).mockResolvedValue([]);

      await useCase.execute(makeRequestingUser(UserRole.ADMIN));

      expect(departmentRepository.findAll).toHaveBeenCalledWith({
        includeInactive: true,
        includeDeleted: false,
      });
    });
  });

  // ── Permission: ROOT (VIEW_INACTIVE_DEPARTMENTS + VIEW_DELETED_DEPARTMENTS) ─────────────────

  describe('execute - ROOT role', () => {
    it('should call findAll with includeInactive=true and includeDeleted=true', async () => {
      vi.mocked(departmentRepository.findAll).mockResolvedValue([]);

      await useCase.execute(makeRequestingUser(UserRole.ROOT));

      expect(departmentRepository.findAll).toHaveBeenCalledWith({
        includeInactive: true,
        includeDeleted: true,
      });
    });

    it('should return all departments including inactive and deleted ones', async () => {
      const activeDept = makeDepartment({ id: 'id-1' });
      const inactiveDept = makeDepartment({ id: 'id-2', isActive: false });
      const deletedDept = makeDepartment({
        id: 'id-3',
        deletedAt: new Date('2024-06-01'),
      });

      vi.mocked(departmentRepository.findAll).mockResolvedValue([
        activeDept,
        inactiveDept,
        deletedDept,
      ]);

      const result = await useCase.execute(makeRequestingUser(UserRole.ROOT));

      expect(result).toHaveLength(3);
      result.forEach((dept) => expect(dept).toBeInstanceOf(Department));
    });
  });

  // ── Return value mapping ──────────────────────────────────────────────────────

  describe('execute - return value mapping', () => {
    it('should correctly map all Department fields including trimming/normalization', async () => {
      const dept = makeDepartment({
        id: 'id-1',
        name: '  Engineering  ',
        code: '  eng  ',
        parentDepartmentId: 'parent-1',
        headEmployeeId: 'emp-1',
        isActive: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
        deletedAt: new Date('2024-07-01'),
      });
      vi.mocked(departmentRepository.findAll).mockResolvedValue([dept]);

      const result = await useCase.execute(makeRequestingUser(UserRole.ROOT));

      expect(result).toHaveLength(1);
      const returned = result[0]!;
      expect(returned.id).toBe('id-1');
      expect(returned.name).toBe('Engineering');
      expect(returned.code).toBe('ENG');
      expect(returned.parentDepartmentId).toBe('parent-1');
      expect(returned.headEmployeeId).toBe('emp-1');
      expect(returned.isActive).toBe(false);
      expect(returned.createdAt).toEqual(new Date('2024-01-01'));
      expect(returned.updatedAt).toEqual(new Date('2024-06-01'));
      expect(returned.deletedAt).toEqual(new Date('2024-07-01'));
    });
  });

  // ── Error propagation ─────────────────────────────────────────────────────────

  describe('execute - repository error propagation', () => {
    it('should propagate errors thrown by findAll', async () => {
      const dbError = new Error('Database connection error');
      vi.mocked(departmentRepository.findAll).mockRejectedValue(dbError);

      await expect(
        useCase.execute(makeRequestingUser(UserRole.EMPLOYEE)),
      ).rejects.toThrow(dbError);
    });
  });
});
