import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '../lib/lineSplitter.ts';
import { isInstagramUsername } from '../platforms/instagram/instagramUsername.ts';
import { readJsonArray, writeJsonAtomic } from './jsonFile.ts';

import type { InstagramAccount } from '@shared/instagram.ts';

interface StoredAccount {
  username: string;
  addedAt: string;
}

// session files hold Instagram login cookies: only this store and the helper scripts ever touch them
export interface InstagramAccountStore {
  list(): InstagramAccount[];
  find(username: string): InstagramAccount | null;
  add(username: string): InstagramAccount;
  remove(username: string): boolean;
  sessionPath(username: string): string;
}

export interface AccountStoreDeps {
  accountsFile: string;
  sessionsDir: string;
}

export function createInstagramAccountStore({ accountsFile, sessionsDir }: AccountStoreDeps): InstagramAccountStore {
  // the helper scripts save sessions under this exact name, so it must not change
  const sessionPath = (username: string): string => path.join(sessionsDir, `session-${username}`);

  function readStored(): StoredAccount[] {
    const accounts: StoredAccount[] = [];
    for (const raw of readJsonArray(accountsFile)) {
      if (!isRecord(raw) || !isInstagramUsername(raw.username)) continue;
      accounts.push({ username: raw.username, addedAt: typeof raw.addedAt === 'string' ? raw.addedAt : '' });
    }
    return accounts;
  }

  const toAccount = (stored: StoredAccount): InstagramAccount => ({
    ...stored,
    hasSession: fs.existsSync(sessionPath(stored.username)),
  });

  return {
    sessionPath,
    list: () => readStored().map(toAccount),

    find(username) {
      const stored = readStored().find((account) => account.username === username);
      return stored ? toAccount(stored) : null;
    },

    add(username) {
      const accounts = readStored();
      const existing = accounts.find((account) => account.username === username);
      if (existing) return toAccount(existing);

      const added = { username, addedAt: new Date().toISOString() };
      writeJsonAtomic(accountsFile, [...accounts, added]);
      return toAccount(added);
    },

    remove(username) {
      const accounts = readStored();
      const remaining = accounts.filter((account) => account.username !== username);
      fs.rmSync(sessionPath(username), { force: true });
      if (remaining.length === accounts.length) return false;

      writeJsonAtomic(accountsFile, remaining);
      return true;
    },
  };
}
