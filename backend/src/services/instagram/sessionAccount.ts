import type { InstagramAccountStore } from '../../stores/instagramAccountStore.ts';

// the requested account if it has a session, else any saved one: logged-in requests are rate-limited far less
export function pickSessionAccount(accounts: InstagramAccountStore, requested: string | null): string | null {
  if (requested && accounts.find(requested)?.hasSession) return requested;
  return accounts.list().find((account) => account.hasSession)?.username ?? null;
}
