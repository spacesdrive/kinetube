// Instagram usernames are 1 to 30 letters, digits, periods and underscores; anything else could reach a file path
const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;

export function isInstagramUsername(value: unknown): value is string {
  return typeof value === 'string' && USERNAME_PATTERN.test(value) && value !== '.' && value !== '..';
}
