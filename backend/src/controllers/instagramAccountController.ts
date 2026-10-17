import { parseLogin, parseTwoFactorCode, parseUsername } from '../validators/instagramValidators.ts';
import { dataResponse, listResponse } from './http.ts';

import type { DataResponse, ListResponse } from '@shared/api.ts';
import type { InstagramAccount, InstagramLoginResult } from '@shared/instagram.ts';
import type { InstagramAccountService } from '../services/instagramAccountService.ts';
import type { Handler } from './http.ts';

export interface InstagramAccountController {
  list: Handler;
  create: Handler;
  verifyTwoFactor: Handler;
  remove: Handler;
}

export function createInstagramAccountController(accounts: InstagramAccountService): InstagramAccountController {
  return {
    list(_req, res) {
      res.json(listResponse(accounts.list()) satisfies ListResponse<InstagramAccount>);
    },

    // 201 when the account was saved, 202 when Instagram first wants a two-factor code
    async create(req, res) {
      const result = await accounts.logIn(parseLogin(req.body));
      res.status(result.status === 'loggedIn' ? 201 : 202).json(dataResponse(result) satisfies DataResponse<InstagramLoginResult>);
    },

    async verifyTwoFactor(req, res) {
      const username = parseUsername(req.params.username);
      const account = await accounts.verifyTwoFactor(username, parseTwoFactorCode(req.body));
      res.status(201).json(dataResponse(account) satisfies DataResponse<InstagramAccount>);
    },

    remove(req, res) {
      accounts.remove(parseUsername(req.params.username));
      res.status(204).end();
    },
  };
}
