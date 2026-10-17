import { useCallback, useState } from 'react';

import { api } from '@/services/api';

import type { InstagramAccount } from '@shared/instagram.ts';

export function useInstagramAccounts() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    api
      .listInstagramAccounts()
      .then(({ data }) => setAccounts(data))
      .catch((failure: unknown) => setError(`Couldn't load the Instagram accounts. ${(failure as Error).message}`));
  }, []);

  const remove = useCallback(async (username: string) => {
    try {
      await api.removeInstagramAccount(username);
      setAccounts((previous) => previous.filter((account) => account.username !== username));
      setActiveAccount((current) => (current === username ? null : current));
    } catch (failure) {
      setError(`Couldn't remove @${username}. ${(failure as Error).message}`);
    }
  }, []);

  const addLoggedIn = useCallback((username: string) => {
    setActiveAccount(username);
    refresh();
  }, [refresh]);

  return { accounts, activeAccount, error, setActiveAccount, refresh, remove, addLoggedIn };
}

export type InstagramAccounts = ReturnType<typeof useInstagramAccounts>;
