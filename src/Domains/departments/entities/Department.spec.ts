import { Department } from './Department.js';

describe('Department entity', () => {
  const payload = {
    id: 'dept-001',
    name: 'Engineering',
    code: 'ENG',
    parentDepartmentId: 'dept-000',
    headEmployeeId: 'emp-001',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
  };

  // === HAPPY PATH ===

  it('should create Department correctly with full payload', () => {
    const dept = new Department(payload);

    expect(dept.id).toBe('dept-001');
    expect(dept.name).toBe('Engineering');
    expect(dept.code).toBe('ENG');
    expect(dept.parentDepartmentId).toBe('dept-000');
    expect(dept.headEmployeeId).toBe('emp-001');
    expect(dept.isActive).toBe(true);
    expect(dept.createdAt).toEqual(new Date('2024-01-01'));
    expect(dept.updatedAt).toEqual(new Date('2024-06-01'));
    expect(dept.deletedAt).toBeNull();
  });

  it('should trim name and uppercase code', () => {
    const dept = new Department({
      ...payload,
      name: '  Engineering  ',
      code: '  eng  ',
    });

    expect(dept.name).toBe('Engineering');
    expect(dept.code).toBe('ENG');
  });

  it('should accept explicit null for parentDepartmentId and headEmployeeId', () => {
    const dept = new Department({
      ...payload,
      parentDepartmentId: null,
      headEmployeeId: null,
    });

    expect(dept.parentDepartmentId).toBeNull();
    expect(dept.headEmployeeId).toBeNull();
  });

  it('should set isActive to false when explicitly passed false', () => {
    const dept = new Department({ ...payload, isActive: false });

    expect(dept.isActive).toBe(false);
  });

  it('should accept a valid Date for deletedAt when the department is soft-deleted', () => {
    const deletionDate = new Date();

    const dept = new Department({
      ...payload,
      deletedAt: deletionDate,
    });

    expect(dept.deletedAt).toBeInstanceOf(Date);
    expect(dept.deletedAt).toEqual(deletionDate);
  });

  // === HAPPY PATH: static create() ===

  it('should create Department via static create() with required fields only', () => {
    const dept = Department.create({
      id: 'dept-002',
      name: 'Human Resources',
      code: 'hr',
    });

    expect(dept.id).toBe('dept-002');
    expect(dept.name).toBe('Human Resources');
    expect(dept.code).toBe('HR');
    expect(dept.parentDepartmentId).toBeNull();
    expect(dept.headEmployeeId).toBeNull();
    expect(dept.isActive).toBe(true);
    expect(dept.createdAt).toBeInstanceOf(Date);
    expect(dept.updatedAt).toBeInstanceOf(Date);
    expect(dept.deletedAt).toBeNull();
  });

  it('should create Department via static create() with optional fields', () => {
    const dept = Department.create({
      id: 'dept-003',
      name: 'Finance',
      code: 'FIN',
      parentDepartmentId: 'dept-001',
      headEmployeeId: 'emp-010',
    });

    expect(dept.parentDepartmentId).toBe('dept-001');
    expect(dept.headEmployeeId).toBe('emp-010');
  });

  it('should default parentDepartmentId and headEmployeeId to null via static create() when undefined', () => {
    const dept = Department.create({
      id: 'dept-004',
      name: 'Legal',
      code: 'LGL',
      parentDepartmentId: undefined,
      headEmployeeId: undefined,
    });

    expect(dept.parentDepartmentId).toBeNull();
    expect(dept.headEmployeeId).toBeNull();
  });

  // === VALIDATION: id ===

  it('should throw when id is empty or whitespace', () => {
    const errorMessage = 'DEPARTMENT.NOT_CONTAIN_NEEDED_PROPERTY';

    expect(() => new Department({ ...payload, id: '' })).toThrow(errorMessage);
    expect(() => new Department({ ...payload, id: '   ' })).toThrow(
      errorMessage,
    );
  });

  // === VALIDATION: name ===

  it('should throw when name is empty or whitespace', () => {
    const errorMessage = 'DEPARTMENT.NOT_CONTAIN_NEEDED_PROPERTY';

    expect(() => new Department({ ...payload, name: '' })).toThrow(
      errorMessage,
    );
    expect(() => new Department({ ...payload, name: '   ' })).toThrow(
      errorMessage,
    );
  });

  // === VALIDATION: code ===

  it('should throw when code is empty or whitespace', () => {
    const errorMessage = 'DEPARTMENT.NOT_CONTAIN_NEEDED_PROPERTY';

    expect(() => new Department({ ...payload, code: '' })).toThrow(
      errorMessage,
    );
    expect(() => new Department({ ...payload, code: '   ' })).toThrow(
      errorMessage,
    );
  });

  // === VALIDATION: self-referencing parent ===

  it('should throw when id equals parentDepartmentId (self-referencing)', () => {
    expect(
      () => new Department({ ...payload, parentDepartmentId: 'dept-001' }),
    ).toThrow('DEPARTMENT.CANNOT_BE_ITS_OWN_PARENT');
  });
});
