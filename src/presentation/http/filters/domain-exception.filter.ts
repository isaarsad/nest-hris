import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  DomainError,
  DomainErrorCategory,
} from '../../../domain/shared/errors/domain.error.js';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

export const STATUS_MAP: Record<DomainErrorCategory, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  INVARIANT: HttpStatus.BAD_REQUEST,
  CONFLICT: HttpStatus.CONFLICT,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  // auth
};

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { startTime?: number }>();
    const { method, url } = request;
    const delay = request.startTime
      ? Math.round(performance.now() - request.startTime)
      : 0;
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorBody: Record<string, unknown> = {
      message: 'Internal server error',
    };

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      const zodError = exception.getZodError() as ZodError;
      errorBody = {
        message: 'Validation failed',

        errors: zodError.issues.map((issue) => ({
          field: issue.path.join('.'),

          message: issue.message,
        })),
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      errorBody =
        typeof res === 'object'
          ? (res as Record<string, unknown>)
          : { message: res };
    } else if (exception instanceof DomainError) {
      status =
        STATUS_MAP[exception.category] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      errorBody = {
        error: exception.code,
        message: exception.message,
      };
    }

    const errorMessage =
      exception instanceof Error ? exception.message : 'Unknown Error';
    const logMessage = `[${method}] ${url} - Status: ${status} - ${delay}ms - Message: ${errorMessage}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(logMessage);
    }

    response.status(status).json({
      statusCode: status,
      ...errorBody,
      timestamp: new Date().toISOString(),
    });
  }
}
