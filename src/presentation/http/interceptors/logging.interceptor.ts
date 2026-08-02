import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();

    const req = ctx.getRequest<Request & { startTime?: number }>();
    const res = ctx.getResponse<Response>();
    const { method, url } = req;

    req.startTime = performance.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = res.statusCode;
        const delay = req.startTime
          ? Math.round(performance.now() - req.startTime)
          : 0;

        this.logger.log(
          `[${method}] ${url} - Status: ${statusCode} - ${delay}ms`,
        );
      }),
    );
  }
}
