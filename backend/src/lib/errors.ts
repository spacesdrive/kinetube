import type { ErrorCode } from '@shared/api.ts';

// every expected failure is one of these; the error handler turns it into the JSON error shape
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, status: number, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_FAILED', 400, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super('FORBIDDEN', 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message);
  }
}

export class NotSupportedError extends AppError {
  constructor(message: string) {
    super('NOT_SUPPORTED', 501, message);
  }
}

export class UpstreamError extends AppError {
  constructor(message: string) {
    super('UPSTREAM_FAILED', 502, message);
  }
}

export class ToolNotInstalledError extends AppError {
  constructor(message: string) {
    super('TOOL_NOT_INSTALLED', 503, message);
  }
}

export class UpstreamTimeoutError extends AppError {
  constructor(message: string) {
    super('UPSTREAM_TIMEOUT', 504, message);
  }
}

export const UNEXPECTED_ERROR_MESSAGE = 'kinetube hit an unexpected error. Try again, and restart the app if it keeps happening.';

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
