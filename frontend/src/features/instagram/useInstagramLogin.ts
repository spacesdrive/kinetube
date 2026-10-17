import { useState } from 'react';

import { api } from '@/services/api';

export type LoginStep = 'credentials' | 'twoFactor';

// logs in through the backend; Instagram may ask for a two-factor code before the account is saved
export function useInstagramLogin(onLoggedIn: (username: string) => void) {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function send(work: () => Promise<void>) {
    setError('');
    setIsSending(true);
    try {
      await work();
    } catch (failure) {
      setError(`Couldn't log in. ${(failure as Error).message}`);
    } finally {
      setIsSending(false);
    }
  }

  function submitCredentials(password: string) {
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed || !password) {
      setError('Enter both the username and the password.');
      return;
    }
    void send(async () => {
      const { data } = await api.createInstagramAccount({ username: trimmed, password });
      if (data.status === 'loggedIn') onLoggedIn(data.account.username);
      else setStep('twoFactor');
    });
  }

  function submitCode(code: string) {
    void send(async () => {
      const { data } = await api.verifyInstagramLogin(username.trim().replace(/^@/, ''), code);
      onLoggedIn(data.username);
    });
  }

  function goBack() {
    setStep('credentials');
    setError('');
  }

  return { step, username, error, isSending, setUsername, submitCredentials, submitCode, goBack };
}
