import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    coverage: {
      exclude: [
        'src/Commons/exceptions/AuthenticationError.ts',
        'src/Commons/exceptions/AuthorizationError.ts',
        'src/Commons/exceptions/ClientError.ts',
        'src/Commons/exceptions/InvariantError.ts',
        'src/Commons/exceptions/NotFoundError.ts',
        'src/Commons/exceptions/DomainErrorTranslator.ts',
        'src/Infrastructures/logging/WinstonLogging.ts',
      ],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
