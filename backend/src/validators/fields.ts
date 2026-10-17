import { ValidationError } from '../lib/errors.ts';
import { isRecord } from '../lib/lineSplitter.ts';

// URLs and file paths both fit comfortably; anything longer is not a real value
export const MAX_TEXT_LENGTH = 2048;

export function readObject(body: unknown, what = 'The request body'): Record<string, unknown> {
  if (!isRecord(body)) throw new ValidationError(`${what} must be a JSON object.`);
  return body;
}

// query values arrive as a string, a list of strings or not at all; only a single string is accepted
export function queryValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function requiredString(value: unknown, field: string, maxLength: number = MAX_TEXT_LENGTH): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`"${field}" is required.`);
  const text = value.trim();
  if (text.length > maxLength) throw new ValidationError(`"${field}" must be ${maxLength} characters or less.`);
  return text;
}

export function optionalString(value: unknown, field: string, maxLength: number = MAX_TEXT_LENGTH): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ValidationError(`"${field}" must be text.`);
  if (value.length > maxLength) throw new ValidationError(`"${field}" must be ${maxLength} characters or less.`);
  return value;
}

export function optionalBoolean(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') throw new ValidationError(`"${field}" must be true or false.`);
  return value;
}

export function optionalInteger(value: unknown, field: string, range: { min: number; max: number }): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < range.min || value > range.max) {
    throw new ValidationError(`"${field}" must be a whole number from ${range.min} to ${range.max}.`);
  }
  return value;
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const match = allowed.find((option) => option === value);
  if (match === undefined) throw new ValidationError(`"${field}" must be one of: ${allowed.join(', ')}.`);
  return match;
}

export function optionalOneOf<T extends string>(value: unknown, field: string, allowed: readonly T[], fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  return oneOf(value, field, allowed);
}
