export interface DepartmentProperties {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  headEmployeeId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Department {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly parentDepartmentId: string | null;
  readonly headEmployeeId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  constructor(payload: DepartmentProperties) {
    this.verifyPayload(payload);

    const {
      id,
      name,
      code,
      parentDepartmentId,
      headEmployeeId,
      isActive,
      createdAt,
      updatedAt,
      deletedAt,
    } = payload;

    this.id = id;
    this.name = name.trim();
    this.code = code.trim().toUpperCase();
    this.parentDepartmentId = parentDepartmentId;
    this.headEmployeeId = headEmployeeId;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
  }

  static create(props: {
    id: string;
    name: string;
    code: string;
    parentDepartmentId?: string | null;
    headEmployeeId?: string | null;
  }): Department {
    return new Department({
      id: props.id,
      name: props.name,
      code: props.code,
      parentDepartmentId: props.parentDepartmentId ?? null,
      headEmployeeId: props.headEmployeeId ?? null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  private verifyPayload(payload: DepartmentProperties) {
    const { id, name, code, parentDepartmentId } = payload;

    if (!id.trim() || !name.trim() || !code.trim()) {
      throw new Error('DEPARTMENT.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (id === parentDepartmentId) {
      throw new Error('DEPARTMENT.CANNOT_BE_ITS_OWN_PARENT');
    }
  }
}
