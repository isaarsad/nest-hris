import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from '../config/index.js';
import { DepartmentOrmEntity } from './entities/department.orm-entity.js';

export const dataSourceOptions: DataSourceOptions = {
  ...config.database,
  entities: [DepartmentOrmEntity],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/migrations/*.js'
      : 'migrations/*.ts',
  ],
  migrationsRun: false,
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
