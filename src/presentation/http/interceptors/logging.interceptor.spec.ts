import { Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { HttpLoggingInterceptor } from './logging.interceptor.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeContext = (
  overrides: { method?: string; url?: string; statusCode?: number } = {},
): ExecutionContext => {
  const request = {
    method: overrides.method ?? 'GET',
    url: overrides.url ?? '/test',
    startTime: undefined as number | undefined,
  };

  const response = {
    statusCode: overrides.statusCode ?? 200,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
};

const makeCallHandler = (): CallHandler => ({
  handle: () => of(null),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HttpLoggingInterceptor', () => {
  let interceptor: HttpLoggingInterceptor;
  let loggerLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    interceptor = new HttpLoggingInterceptor();
    loggerLogSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Sets startTime ────────────────────────────────────────────────────────

  describe('request startTime', () => {
    it('should set startTime on the request before handling', () => {
      const ctx = makeContext();
      const req = ctx.switchToHttp().getRequest<{ startTime?: number }>();
      const before = performance.now();

      interceptor.intercept(ctx, makeCallHandler()).subscribe();

      expect(req.startTime).toBeGreaterThanOrEqual(before);
      expect(req.startTime).toBeLessThanOrEqual(performance.now());
    });
  });

  // ── Returns observable ────────────────────────────────────────────────────

  describe('return value', () => {
    it('should return an Observable', () => {
      const ctx = makeContext();
      const result = interceptor.intercept(ctx, makeCallHandler());

      expect(result).toBeInstanceOf(Observable);
    });
  });

  // ── Logging ───────────────────────────────────────────────────────────────

  describe('logging', () => {
    it('should format and log HTTP request details matching "^[METHOD] URL - Status: CODE - NUMms$"', () => {
      const ctx = makeContext({
        method: 'POST',
        url: '/api/v1/departments',
        statusCode: 201,
      });

      interceptor.intercept(ctx, makeCallHandler()).subscribe();

      expect(loggerLogSpy).toHaveBeenCalledExactlyOnceWith(
        expect.stringMatching(
          /^\[POST\] \/api\/v1\/departments - Status: 201 - \d+ms$/,
        ),
      );
    });

    it('should include a valid non-negative delay in log after intercept sets startTime', () => {
      const ctx = makeContext();

      interceptor.intercept(ctx, makeCallHandler()).subscribe();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const logMessage = loggerLogSpy.mock.calls[0]?.[0] as string;
      const match = /- (\d+)ms/.exec(logMessage);
      const delay = match ? parseInt(match[1]!, 10) : -1;

      expect(delay).toBeGreaterThanOrEqual(0);
    });

    it('should log 0ms delay when startTime is undefined at the time of tap', () => {
      const ctx = makeContext();
      const req = ctx.switchToHttp().getRequest<{ startTime?: number }>();

      let resolveHandle!: () => void;
      const deferredHandler: CallHandler = {
        handle: () => {
          return new Observable((subscriber) => {
            resolveHandle = () => {
              delete req.startTime;
              subscriber.next(null);
              subscriber.complete();
            };
          });
        },
      };

      interceptor.intercept(ctx, deferredHandler).subscribe();
      resolveHandle();

      expect(loggerLogSpy).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('0ms'),
      );
    });

    it('should not log before the response stream emits', () => {
      const ctx = makeContext();
      const silentHandler: CallHandler = { handle: () => of() };

      interceptor.intercept(ctx, silentHandler).subscribe();

      expect(loggerLogSpy).not.toHaveBeenCalled();
    });
  });
});
