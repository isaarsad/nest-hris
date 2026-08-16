import { DataSource } from 'typeorm';
import { UserOrmEntity } from '../../src/infrastructure/database/entities/user.orm-entity.js';
import { UserRole } from '../../src/domain/users/user-role-permissions.js';

export class UserTableTestHelper {
  constructor(private readonly dataSource: DataSource) {}

  async clear() {
    await this.dataSource.query('TRUNCATE TABLE users CASCADE');
  }

  async insert(props: Partial<UserOrmEntity>) {
    const defaults = {
      id: crypto.randomUUID(),
      username: 'defaultuser',
      email: 'default@example.com',
      passwordHash: '$2b$10$hashedpassword',
      role: UserRole.EMPLOYEE,
      isActive: true,
      deletedAt: null,
    };

    const data = { ...defaults, ...props };

    await this.dataSource.query(
      `
      INSERT INTO users
      (id, username, email, password_hash, role, is_active, created_at, updated_at, deleted_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7)
      `,
      [
        data.id,
        data.username,
        data.email,
        data.passwordHash,
        data.role,
        data.isActive,
        data.deletedAt,
      ],
    );

    return data;
  }

  async findByIdRaw(id: string): Promise<UserOrmEntity | null> {
    const rows = await this.dataSource.query<UserOrmEntity[]>(
      `SELECT
        id,
        username,
        email,
        password_hash AS "passwordHash",
        role,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        deleted_at AS "deletedAt"
      FROM users WHERE id = $1`,
      [id],
    );

    return rows[0] || null;
  }

  async findByUsernameRaw(username: string): Promise<UserOrmEntity | null> {
    const rows = await this.dataSource.query<UserOrmEntity[]>(
      `SELECT
        id,
        username,
        email,
        password_hash AS "passwordHash",
        role,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        deleted_at AS "deletedAt"
      FROM users WHERE username = $1`,
      [username],
    );

    return rows[0] || null;
  }
}
