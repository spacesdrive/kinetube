import { NotFoundError, UpstreamError } from '../lib/errors.ts';
import { createPendingLogins } from './instagram/pendingLogins.ts';

import type { CreateInstagramAccountRequest, InstagramAccount, InstagramLoginResult } from '@shared/instagram.ts';
import type { InstaloaderManager } from '../managers/instaloader/instaloaderManager.ts';
import type { HelperMessage, PythonHelper } from '../managers/instaloader/pythonHelper.ts';
import type { InstagramAccountStore } from '../stores/instagramAccountStore.ts';

export interface InstagramAccountService {
  list(): InstagramAccount[];
  remove(username: string): void;
  logIn(request: CreateInstagramAccountRequest): Promise<InstagramLoginResult>;
  verifyTwoFactor(username: string, code: string): Promise<InstagramAccount>;
}

export interface InstagramAccountDeps {
  accounts: InstagramAccountStore;
  instaloader: InstaloaderManager;
  sessionsDir: string;
}

// Instagram answers a login in a few seconds; 45 seconds means it is stalling the request
const LOGIN_TIMEOUT_MS = 45_000;
const LOGIN_TIMEOUT_MESSAGE = 'Instagram took more than 45 seconds to answer. Try again in a few minutes.';

function failureMessage(reply: HelperMessage, fallback: string): string {
  return typeof reply.message === 'string' && reply.message ? reply.message : fallback;
}

async function readReply(helper: PythonHelper): Promise<HelperMessage> {
  try {
    return await helper.nextMessage(LOGIN_TIMEOUT_MS, LOGIN_TIMEOUT_MESSAGE);
  } catch (error) {
    helper.kill();
    throw error;
  }
}

export function createInstagramAccountService({ accounts, instaloader, sessionsDir }: InstagramAccountDeps): InstagramAccountService {
  const pendingLogins = createPendingLogins();

  return {
    list: () => accounts.list(),

    remove(username) {
      pendingLogins.cancel(username);
      if (!accounts.remove(username)) throw new NotFoundError(`There's no saved account @${username}.`);
    },

    async logIn({ username, password }) {
      pendingLogins.cancel(username);
      const helper = await instaloader.startHelper('login');
      // the password goes to the helper over stdin only; it is never logged or stored
      helper.write({ username, password, sessions_dir: sessionsDir });
      const reply = await readReply(helper);

      if (reply.status === 'twofa_required') {
        pendingLogins.hold(username, helper);
        return { status: 'twoFactorRequired', username };
      }
      helper.kill();
      if (reply.status !== 'success') throw new UpstreamError(failureMessage(reply, 'Instagram refused the login. Check the username and password.'));
      return { status: 'loggedIn', account: accounts.add(username) };
    },

    async verifyTwoFactor(username, code) {
      const helper = pendingLogins.take(username);
      if (!helper) throw new NotFoundError(`No login is waiting for a code for @${username}. Start the login again.`);

      helper.write({ code });
      const reply = await readReply(helper);
      helper.kill();
      if (reply.status !== 'success') {
        throw new UpstreamError(failureMessage(reply, "Instagram didn't accept the code. Start the login again and use a new code."));
      }
      return accounts.add(username);
    },
  };
}
