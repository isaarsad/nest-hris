import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    coverage: {
      exclude: [
        'migrations/**',
        'src/domain/shared/value-objects/**',
        'src/domain/shared/errors/**',
        'src/domain/departments/errors/**',
        'src/domain/users/errors/**',
        'src/infrastructure/database/entities/**',
        'src/infrastructure/database/data-source.ts',
        'src/infrastructure/config/**',
        'src/presentation/http/decorators/current-user.decorator.ts',
        'src/presentation/http/departments/dto/department-response.dto.ts',
        'src/presentation/http/users/dto/user-response.dto.ts',
        'src/presentation/http/departments/departments.controller.ts',
        'src/presentation/http/users/users.controller.ts',
        'src/presentation/http/departments/departments.module.ts',
        'src/presentation/http/users/users.module.ts',
      ],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
