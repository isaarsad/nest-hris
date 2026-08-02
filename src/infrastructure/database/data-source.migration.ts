import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from '../config/index.js';

export const migrationDataSourceOptions: DataSourceOptions = {
  ...config.database,
  entities: [],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/migrations/*.js'
      : 'migrations/*.ts',
  ],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
};

const migrationDataSource = new DataSource(migrationDataSourceOptions);
export default migrationDataSource;
