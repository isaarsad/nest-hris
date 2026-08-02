import { DataSource } from 'typeorm';
import { DepartmentOrmEntity } from '../../src/infrastructure/database/entities/department.orm-entity.js';

export class DepartmentTableTestHelper {
  constructor(private readonly dataSource: DataSource) {}

  async clear() {
    await this.dataSource.query('TRUNCATE TABLE departments CASCADE');
  }

  async insert(props: Partial<DepartmentOrmEntity>) {
    const defaults = {
      id: crypto.randomUUID(),
      name: 'Default Department',
      code: 'DFT',
      parentDepartmentId: null,
      headEmployeeId: null,
      isActive: true,
      deletedAt: null,
    };

    const data = { ...defaults, ...props };

    await this.dataSource.query(
      `
      INSERT INTO departments
      (id,name,code,parent_department_id,head_employee_id,is_active,created_at,updated_at,deleted_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),$7)
      `,
      [
        data.id,
        data.name,
        data.code,
        data.parentDepartmentId,
        data.headEmployeeId,
        data.isActive,
        data.deletedAt,
      ],
    );

    return data;
  }

  async findByIdRaw(id: string): Promise<DepartmentOrmEntity | null> {
    const rows = await this.dataSource.query<DepartmentOrmEntity[]>(
      `SELECT 
        id, 
        name, 
        code, 
        parent_department_id AS "parentDepartmentId", 
        head_employee_id AS "headEmployeeId", 
        is_active AS "isActive", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt", 
        deleted_at AS "deletedAt"
      FROM departments WHERE id = $1`,
      [id],
    );

    return rows[0] || null;
  }
}
