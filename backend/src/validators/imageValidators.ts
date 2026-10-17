import { queryValue, requiredString } from './fields.ts';

export function parseImageUrl(query: Record<string, unknown>): string {
  return requiredString(queryValue(query.url), 'url');
}
