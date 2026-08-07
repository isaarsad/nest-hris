import { CreateDepartmentUseCase } from './create-department.use-case.js';
import { DepartmentRepository } from '../../domain/departments/department.repository.js';
import {
  Department,
  DepartmentProps,
} from '../../domain/departments/entities/department.entity.js';
import {
  DepartmentAlreadyExistsError,
  DepartmentNotFoundError,
  DepartmentPermissionDeniedError,
} from '../../domain/departments/errors/index.js';
import { RequestingUser } from '../../domain/users/entities/requesting-user.entity.js';
import { UserRole } from '../../domain/users/user-role-permissions.js';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const mockDepartmentRepository = (): DepartmentRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByParentId: vi.fn(),
  findAll: vi.fn(),
  existById: vi.fn(),
  existByName: vi.fn(),
  existByCode: vi.fn(),
});

const mockIdGenerator = () => 'id-123';

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

// User with the ROOT role has CREATE_DEPARTMENT permission
const makeAuthorizedUser = () => new RequestingUser('user-root', UserRole.ROOT);

// Users with the EMPLOYEE role do not have the CREATE_DEPARTMENT permission
const makeUnauthorizedUser = () =>
  new RequestingUser('user-emp', UserRole.EMPLOYEE);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateDepartmentUseCase', () => {
  let departmentRepository: DepartmentRepository;
  let useCase: CreateDepartmentUseCase;

  beforeEach(() => {
    departmentRepository = mockDepartmentRepository();
    useCase = new CreateDepartmentUseCase(
      departmentRepository,
      mockIdGenerator,
    );
  });

  // ── Permission guard ────────────────────────────────────────────────────────

  describe('execute - permission check', () => {
    it('should throw PermissionDeniedError if user does not have CREATE_DEPARTMENT permission', async () => {
      const unauthorizedUser = makeUnauthorizedUser();

      await expect(
        useCase.execute(unauthorizedUser, { name: 'Engineering', code: 'ENG' }),
      ).rejects.toThrow(DepartmentPermissionDeniedError);

      expect(departmentRepository.existByName).not.toHaveBeenCalled();
      expect(departmentRepository.existByCode).not.toHaveBeenCalled();
      expect(departmentRepository.save).not.toHaveBeenCalled();
    });

    it('should proceed normally if user has CREATE_DEPARTMENT permission', async () => {
      const authorizedUser = makeAuthorizedUser();
      const savedDepartment = makeDepartment();

      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.save).mockResolvedValue(savedDepartment);

      const result = await useCase.execute(authorizedUser, {
        name: 'Engineering',
        code: 'ENG',
      });

      expect(departmentRepository.existByName).toHaveBeenCalledWith(
        'Engineering',
      );
      expect(departmentRepository.existByCode).toHaveBeenCalledWith('ENG');
      expect(result).toEqual(savedDepartment);
    });
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('execute - happy path', () => {
    it('should successfully create a department without parentDepartmentId and headEmployeeId', async () => {
      const savedDepartment = makeDepartment();

      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.save).mockResolvedValue(savedDepartment);

      const result = await useCase.execute(makeAuthorizedUser(), {
        name: 'Engineering',
        code: 'ENG',
      });

      expect(departmentRepository.existByName).toHaveBeenCalledWith(
        'Engineering',
      );
      expect(departmentRepository.existByCode).toHaveBeenCalledWith('ENG');
      expect(departmentRepository.findById).not.toHaveBeenCalled();
      expect(departmentRepository.save).toHaveBeenCalledOnce();
      expect(result).toEqual(savedDepartment);
    });

    it('should successfully create a department with a valid parentDepartmentId', async () => {
      const parentId = '550e8400-e29b-41d4-a716-446655440000';
      const parentDepartment = makeDepartment({
        id: parentId,
        name: 'Company',
        code: 'CMP',
      });
      const savedDepartment = makeDepartment({ parentDepartmentId: parentId });

      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.findById).mockResolvedValue(
        parentDepartment,
      );
      vi.mocked(departmentRepository.save).mockResolvedValue(savedDepartment);

      const result = await useCase.execute(makeAuthorizedUser(), {
        name: 'Engineering',
        code: 'ENG',
        parentDepartmentId: parentId,
      });

      expect(departmentRepository.findById).toHaveBeenCalledWith(parentId);
      expect(departmentRepository.save).toHaveBeenCalledOnce();
      expect(result).toEqual(savedDepartment);
    });

    it('should successfully create a department with a headEmployeeId', async () => {
      const headId = '550e8400-e29b-41d4-a716-446655440001';
      const savedDepartment = makeDepartment({ headEmployeeId: headId });

      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.save).mockResolvedValue(savedDepartment);

      const result = await useCase.execute(makeAuthorizedUser(), {
        name: 'Engineering',
        code: 'ENG',
        headEmployeeId: headId,
      });

      expect(departmentRepository.save).toHaveBeenCalledOnce();
      expect(result).toEqual(savedDepartment);
    });

    it('should successfully create a department with parentDepartmentId set to null', async () => {
      const savedDepartment = makeDepartment();

      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.save).mockResolvedValue(savedDepartment);

      const result = await useCase.execute(makeAuthorizedUser(), {
        name: 'Engineering',
        code: 'ENG',
        parentDepartmentId: null,
      });

      expect(departmentRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(savedDepartment);
    });

    it('should call save with a correctly populated Department instance', async () => {
      const savedDepartment = makeDepartment();

      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.save).mockResolvedValue(savedDepartment);

      await useCase.execute(makeAuthorizedUser(), {
        name: 'Engineering',
        code: 'ENG',
      });

      const [savedArg] = vi.mocked(departmentRepository.save).mock.calls[0]!;
      expect(savedArg).toBeInstanceOf(Department);
      expect(savedArg.id).toBe('id-123');
      expect(savedArg.name).toBe('Engineering');
      expect(savedArg.code).toBe('ENG');
      expect(savedArg.isActive).toBe(true);
      expect(savedArg.parentDepartmentId).toBeNull();
      expect(savedArg.headEmployeeId).toBeNull();
    });
  });

  // ── Validation: name ────────────────────────────────────────────────────────

  describe('execute - name validation', () => {
    it('should throw DepartmentAlreadyExistError if the department name is already in use', async () => {
      vi.mocked(departmentRepository.existByName).mockResolvedValue(true);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);

      const payload = { name: 'Engineering', code: 'ENG' };

      await expect(
        useCase.execute(makeAuthorizedUser(), payload),
      ).rejects.toThrow(new DepartmentAlreadyExistsError('name', payload.name));

      // Promise.all
      expect(departmentRepository.existByCode).toHaveBeenCalledWith('ENG');
      expect(departmentRepository.findById).not.toHaveBeenCalled();
      expect(departmentRepository.save).not.toHaveBeenCalled();
    });
  });

  // ── Validation: code ────────────────────────────────────────────────────────

  describe('execute - code validation', () => {
    it('should throw DepartmentAlreadyExistError if the department code is already in use', async () => {
      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(true);

      const payload = { name: 'Engineering', code: 'ENG' };

      await expect(
        useCase.execute(makeAuthorizedUser(), payload),
      ).rejects.toThrow(new DepartmentAlreadyExistsError('code', payload.code));

      expect(departmentRepository.existByName).toHaveBeenCalledWith(
        'Engineering',
      );
      expect(departmentRepository.findById).not.toHaveBeenCalled();
      expect(departmentRepository.save).not.toHaveBeenCalled();
    });
  });

  // ── Validation: parentDepartmentId ──────────────────────────────────────────

  describe('execute - parent department validation', () => {
    it('should throw DepartmentNotFoundError if parentDepartmentId does not exist', async () => {
      const parentId = '550e8400-e29b-41d4-a716-446655440000';

      const payload = {
        name: 'Engineering',
        code: 'ENG',
        parentDepartmentId: parentId,
      };

      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute(makeAuthorizedUser(), payload),
      ).rejects.toThrow(
        new DepartmentNotFoundError(payload.parentDepartmentId),
      );

      expect(departmentRepository.findById).toHaveBeenCalledWith(parentId);
      expect(departmentRepository.save).not.toHaveBeenCalled();
    });

    it('should not call findById if parentDepartmentId is omitted', async () => {
      const savedDepartment = makeDepartment();

      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.save).mockResolvedValue(savedDepartment);

      await useCase.execute(makeAuthorizedUser(), {
        name: 'Engineering',
        code: 'ENG',
      });

      expect(departmentRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ── Error propagation ───────────────────────────────────────────────────────

  describe('execute - repository error propagation', () => {
    it('should propagate errors thrown by existByName', async () => {
      const dbError = new Error('Database connection error');
      vi.mocked(departmentRepository.existByName).mockRejectedValue(dbError);

      await expect(
        useCase.execute(makeAuthorizedUser(), {
          name: 'Engineering',
          code: 'ENG',
        }),
      ).rejects.toThrow(dbError);
    });

    it('should propagate errors thrown by existByCode', async () => {
      const dbError = new Error('Database connection error');
      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockRejectedValue(dbError);

      await expect(
        useCase.execute(makeAuthorizedUser(), {
          name: 'Engineering',
          code: 'ENG',
        }),
      ).rejects.toThrow(dbError);
    });

    it('should propagate errors thrown by save', async () => {
      const dbError = new Error('Database write error');
      vi.mocked(departmentRepository.existByName).mockResolvedValue(false);
      vi.mocked(departmentRepository.existByCode).mockResolvedValue(false);
      vi.mocked(departmentRepository.save).mockRejectedValue(dbError);

      await expect(
        useCase.execute(makeAuthorizedUser(), {
          name: 'Engineering',
          code: 'ENG',
        }),
      ).rejects.toThrow(dbError);
    });
  });
});
