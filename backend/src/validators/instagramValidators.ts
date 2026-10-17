import { ValidationError } from '../lib/errors.ts';
import { isInstagramUsername } from '../platforms/instagram/instagramUsername.ts';
import { readObject, requiredString } from './fields.ts';

import type { CreateInstagramAccountRequest } from '@shared/instagram.ts';

const USERNAME_RULE = 'Instagram usernames use only letters, numbers, periods and underscores, up to 30 characters.';

// Instagram passwords may be long passphrases, but never this long
const MAX_PASSWORD_LENGTH = 256;

// six digits from an authenticator or SMS, or an eight digit backup code; spaces are allowed while typing
const TWO_FACTOR_CODE_PATTERN = /^\d{6,8}$/;

export function parseUsername(value: unknown): string {
  const username = typeof value === 'string' ? value.trim().replace(/^@/, '') : '';
  if (!isInstagramUsername(username)) throw new ValidationError(USERNAME_RULE);
  return username;
}

export function parseOptionalUsername(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return parseUsername(value);
}

export function parseLogin(body: unknown): CreateInstagramAccountRequest {
  const fields = readObject(body);
  // the password is sent on exactly as typed: leading or trailing spaces can be part of it
  if (typeof fields.password !== 'string' || !fields.password) throw new ValidationError('"password" is required.');
  if (fields.password.length > MAX_PASSWORD_LENGTH) throw new ValidationError(`"password" must be ${MAX_PASSWORD_LENGTH} characters or less.`);

  return { username: parseUsername(fields.username), password: fields.password };
}

export function parseTwoFactorCode(body: unknown): string {
  const code = requiredString(readObject(body).code, 'code', 16).replace(/\s/g, '');
  if (!TWO_FACTOR_CODE_PATTERN.test(code)) throw new ValidationError('The code is the 6 digit number Instagram sent you.');
  return code;
}
