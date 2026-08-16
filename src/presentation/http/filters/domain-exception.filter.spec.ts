import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { DomainExceptionFilter } from './domain-exception.filter.js';
import {
  DomainError,
  DomainErrorCategory,
} from '../../../domain/shared/errors/base/domain.error.js';
import { NotFoundError } from '../../../domain/shared/errors/base/not-found.error.js';
import { ConflictError } from '../../../domain/shared/errors/base/conflict.error.js';
import { InvariantError } from '../../../domain/shared/errors/base/invariant.error.js';
import { ForbiddenError } from '../../../domain/shared/errors/base/forbidden.error.js';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

// ─── Dummy Classes for Testing ──────────────────────────────────────────────

class TestNotFoundError extends NotFoundError {
  readonly code = 'TEST_NOT_FOUND';

  constructor(msg = 'Resource not found') {
    super(msg);
  }
}

class TestConflictError extends ConflictError {
  readonly code = 'TEST_CONFLICT';

  constructor(msg = 'Conflict occurred') {
    super(msg);
  }
}

class TestInvariantError extends InvariantError {
  readonly code = 'TEST_INVARIANT';

  constructor(msg = 'Invariant violated') {
    super(msg);
  }
}

class TestForbiddenError extends ForbiddenError {
  readonly code = 'TEST_FORBIDDEN';

  constructor(msg = 'Forbidden access') {
    super(msg);
  }
}

class UnmappedDomainError extends DomainError {
  readonly category = 'UNMAPPED' as DomainErrorCategory;
  readonly code = 'UNMAPPED_ERROR_CODE';
  constructor() {
    super('Unmapped error occurred');
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;
  let makeJsonMock: ReturnType<typeof vi.fn>;
  let makeStatusMock: ReturnType<typeof vi.fn>;

  const makeHost = (
    overrides: { method?: string; url?: string; startTime?: number } = {},
  ): ArgumentsHost => {
    const request = {
      method: overrides.method ?? 'GET',
      url: overrides.url ?? '/test',
      ...(overrides.startTime !== undefined
        ? { startTime: overrides.startTime }
        : {}),
    };

    return {
      switchToHttp: () => ({
        getResponse: () => ({ status: makeStatusMock }),
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
  };

  beforeEach(() => {
    filter = new DomainExceptionFilter();
    makeJsonMock = vi.fn();
    makeStatusMock = vi.fn().mockReturnValue({ json: makeJsonMock });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── ZodValidationException ──────────────────────────────────────────────────

  describe('when exception is a ZodValidationException', () => {
    it('should format ZodValidationException to 400 BAD_REQUEST with mapped error fields', () => {
      const mockZodError = {
        issues: [
          { path: ['name'], code: 'invalid_type', message: 'Name is required' },
          {
            path: ['address', 'city'],
            code: 'invalid_format',
            message: 'Invalid city',
          },
        ],
      } as ZodError;

      const exception = new ZodValidationException(mockZodError);

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors: [
          {
            field: 'name',
            code: 'invalid_type',
            message: 'Name is required',
          },
          {
            field: 'address.city',
            code: 'invalid_format',
            message: 'Invalid city',
          },
        ],
        timestamp: expect.any(String),
      });
    });
  });

  // ── HttpException ────────────────────────────────────────────────────────────

  describe('when exception is an HttpException', () => {
    it('should respond with the HttpException status, object body, and timestamp', () => {
      const exception = new HttpException(
        { message: 'Not Found', error: 'Not Found' },
        HttpStatus.NOT_FOUND,
      );

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not Found',
        error: 'Not Found',
        timestamp: expect.any(String),
      });
    });

    it('should wrap a string HttpException response in a message property', () => {
      const exception = new HttpException(
        'Bad Request',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad Request',
        timestamp: expect.any(String),
      });
    });
  });

  // ── DomainError ──────────────────────────────────────────────────────────────

  describe('when exception is a DomainError', () => {
    it('should map NOT_FOUND domain error to 404', () => {
      const exception = new TestNotFoundError('Department not found');

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'TEST_NOT_FOUND',
        message: 'Department not found',
        timestamp: expect.any(String),
      });
    });

    it('should map CONFLICT domain error to 409', () => {
      const exception = new TestConflictError('Department already exists');

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        error: 'TEST_CONFLICT',
        message: 'Department already exists',
        timestamp: expect.any(String),
      });
    });

    it('should map INVARIANT domain error to 400', () => {
      const exception = new TestInvariantError('Invalid input');

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'TEST_INVARIANT',
        message: 'Invalid input',
        timestamp: expect.any(String),
      });
    });

    it('should map FORBIDDEN domain error to 403', () => {
      const exception = new TestForbiddenError('Access denied');

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'TEST_FORBIDDEN',
        message: 'Access denied',
        timestamp: expect.any(String),
      });
    });

    it('should fallback to 500 INTERNAL_SERVER_ERROR if DomainErrorCategory is missing from STATUS_MAP', () => {
      const exception = new UnmappedDomainError();

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'UNMAPPED_ERROR_CODE',
        message: 'Unmapped error occurred',
        timestamp: expect.any(String),
      });
    });
  });

  // ── Unknown exception ────────────────────────────────────────────────────────

  describe('when exception is unknown', () => {
    it('should respond with 500 for a plain Error', () => {
      const exception = new Error('Unexpected crash');

      filter.catch(exception, makeHost());

      expect(makeStatusMock).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(makeJsonMock).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        timestamp: expect.any(String),
      });
    });
  });

  // ── Logging behaviour ────────────────────────────────────────────────────────

  describe('logging behaviour', () => {
    it('should call logger.error with stack trace for 5xx exceptions', () => {
      const loggerErrorSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      const exception = new Error('Unexpected crash');

      filter.catch(exception, makeHost({ method: 'POST', url: '/api/test' }));

      expect(loggerErrorSpy).toHaveBeenCalledExactlyOnceWith(
        expect.stringMatching(
          /\[POST\] \/api\/test - Status: 500 - \d+ms - Message: Unexpected crash/,
        ),
        exception.stack,
      );
    });

    it('should call logger.warn for 4xx exceptions', () => {
      const loggerWarnSpy = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      const exception = new TestConflictError('Department code already exists');

      filter.catch(exception, makeHost({ method: 'POST', url: '/api/depts' }));

      expect(loggerWarnSpy).toHaveBeenCalledExactlyOnceWith(
        expect.stringMatching(
          /\[POST\] \/api\/depts - Status: 409 - \d+ms - Message: Department code already exists/,
        ),
      );
    });

    it('should pass undefined as stack when exception is not an Error (5xx)', () => {
      const loggerErrorSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      filter.catch({ custom: 'obj' }, makeHost());

      expect(loggerErrorSpy).toHaveBeenCalledOnce();
      const [, stack] = loggerErrorSpy.mock.calls[0]! as [unknown, unknown];
      expect(stack).toBeUndefined();
    });

    it('should include delay in log message when startTime is set', () => {
      const loggerWarnSpy = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      const startTime = performance.now() - 42;
      const exception = new TestNotFoundError();

      filter.catch(exception, makeHost({ startTime }));

      expect(loggerWarnSpy).toHaveBeenCalledExactlyOnceWith(
        expect.stringMatching(
          /\[GET\] \/test - Status: 404 - \d+ms - Message:/,
        ),
      );
    });

    it('should use 0ms delay when startTime is not set', () => {
      const loggerWarnSpy = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      filter.catch(new TestNotFoundError(), makeHost());

      expect(loggerWarnSpy).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining('0ms'),
      );
    });
  });
});
