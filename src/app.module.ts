import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './infrastructure/database/data-source.js';
import { DepartmentsModule } from './presentation/http/departments/departments.module.js';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { DomainExceptionFilter } from './presentation/http/filters/domain-exception.filter.js';
import { HttpLoggingInterceptor } from './presentation/http/interceptors/logging.interceptor.js';
import { ZodValidationPipe } from 'nestjs-zod';
import { UsersModule } from './presentation/http/users/users.module.js';
import { AuthModule } from './presentation/http/auth/auth.module.js';
import { AuthGuard } from './presentation/http/guards/auth.guard.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    DepartmentsModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule {}
