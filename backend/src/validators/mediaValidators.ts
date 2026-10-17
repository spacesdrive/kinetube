import { parseOptionalUsername } from './instagramValidators.ts';
import { queryValue, requiredString } from './fields.ts';

export interface MediaQuery {
  url: string;
  account: string | null;
}

export function parseMediaQuery(query: Record<string, unknown>): MediaQuery {
  return {
    url: requiredString(queryValue(query.url), 'url'),
    account: parseOptionalUsername(queryValue(query.account)),
  };
}
