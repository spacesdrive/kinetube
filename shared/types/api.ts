// the envelope every JSON response from /api/v1 uses: one shape for items, lists and errors

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_SUPPORTED'
  | 'TOOL_NOT_INSTALLED'
  | 'UPSTREAM_FAILED'
  | 'UPSTREAM_TIMEOUT'
  | 'CANCELLED'
  | 'INTERNAL';

export interface DataResponse<T> {
  data: T;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface ErrorResponse {
  success: false;
  code: ErrorCode;
  message: string;
  requestId: string;
}

// the last event of every stream: success carries the result, failure carries the same code and message as a JSON error
export type StreamDone<T extends object = object> =
  | ({ success: true; message: string } & T)
  | { success: false; code: ErrorCode; message: string };

export interface LogEvent {
  message: string;
  level: 'info' | 'error';
}

export interface WarningEvent {
  message: string;
}

export interface TransferProgress {
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  bytesPerSecond: number;
}
