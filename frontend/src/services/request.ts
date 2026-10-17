import type { ErrorCode, ErrorResponse } from '@shared/api.ts';

export const API_BASE = '/api/v1';

export type ClientErrorCode = ErrorCode | 'NETWORK';

// every failed request becomes one of these, carrying the backend's message for the toast or inline error
export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;

  constructor(status: number, code: ClientErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const UNREACHABLE_MESSAGE = "Couldn't reach the KineTube backend. Restart the app if this keeps happening.";

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (isErrorResponse(body)) return new ApiError(response.status, body.code, body.message);
  return new ApiError(response.status, 'INTERNAL', `The backend answered with status ${response.status}. Try again.`);
}

export async function sendRequest(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, init);
  } catch (error) {
    // an abort is the caller's own choice, so it is passed on unchanged
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK', UNREACHABLE_MESSAGE);
  }
}

// GET by default; any status outside 2xx throws an ApiError with the backend's message
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await sendRequest(path, init);
  if (!response.ok) throw await toApiError(response);
  // the response type is the shared contract for this route, so the parsed body is trusted to match it
  return (await response.json()) as T;
}

// for routes that answer 204 No Content
export async function requestNoContent(path: string, init: RequestInit = {}): Promise<void> {
  const response = await sendRequest(path, init);
  if (!response.ok) throw await toApiError(response);
}

export function jsonInit(body: unknown, method = 'POST'): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
