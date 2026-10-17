import type { PythonHelper } from '../../managers/instaloader/pythonHelper.ts';

export interface PendingLogins {
  // replaces and stops any login already waiting for this username
  hold(username: string, helper: PythonHelper): void;
  take(username: string): PythonHelper | null;
  cancel(username: string): void;
}

// the helper sits blocked on stdin waiting for the code; past 5 minutes Instagram has expired it anyway
const CODE_WAIT_MS = 5 * 60_000;

// logins paused at Instagram's two-factor prompt, keyed by username
export function createPendingLogins(): PendingLogins {
  const waiting = new Map<string, { helper: PythonHelper; timer: NodeJS.Timeout }>();

  function cancel(username: string): void {
    const entry = waiting.get(username);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.helper.kill();
    waiting.delete(username);
  }

  return {
    cancel,

    hold(username, helper) {
      cancel(username);
      const timer = setTimeout(() => cancel(username), CODE_WAIT_MS);
      // an unfinished login must not keep the backend process alive on shutdown
      timer.unref();
      waiting.set(username, { helper, timer });
    },

    take(username) {
      const entry = waiting.get(username);
      if (!entry) return null;
      clearTimeout(entry.timer);
      waiting.delete(username);
      return entry.helper;
    },
  };
}
