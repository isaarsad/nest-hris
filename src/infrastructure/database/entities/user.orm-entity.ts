import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../../../domain/users/user-role-permissions.js';

@Entity('users')
@Index('UQ_USERS_USERNAME_ACTIVE', ['username'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
@Index('UQ_USERS_EMAIL_ACTIVE', ['email'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'citext' })
  username!: string;

  @Column({ type: 'citext' })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.EMPLOYEE,
  })
  @Index()
  role!: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  deletedAt!: Date | null;
}
