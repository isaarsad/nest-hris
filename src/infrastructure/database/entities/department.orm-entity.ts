import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

@Entity('departments')
@Unique('UQ_DEPARTMENTS_NAME', ['name'])
@Unique('UQ_DEPARTMENTS_CODE', ['code'])
export class DepartmentOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'citext' })
  name!: string;

  @Column({ type: 'citext' })
  code!: string;

  @Column({ name: 'head_employee_id', type: 'uuid', nullable: true })
  @Index()
  headEmployeeId!: string | null;

  @Column({ name: 'parent_department_id', type: 'uuid', nullable: true })
  @Index()
  parentDepartmentId!: string | null;

  @ManyToOne(() => DepartmentOrmEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_department_id' })
  parentDepartment!: DepartmentOrmEntity | null;

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
