import type { DownloadEvents, Platform } from '@shared/downloads.ts';
import type { EventSink } from '../../lib/sse.ts';

export interface ErrorWatcher {
  onErrorOutput(text: string): void;
  lastError(): string;
}

const LOGIN_HINT = 'This content may need a login. Add an Instagram account in the Instagram tab.';

// logs yt-dlp's stderr, keeps its last line for the failure message, and warns once if Instagram wants a login
export function watchErrors(platform: Platform, send: EventSink<DownloadEvents>): ErrorWatcher {
  let lastError = '';
  let hasSentLoginHint = false;

  return {
    onErrorOutput(text) {
      lastError = text.split('\n').at(-1) ?? text;
      send('log', { message: text, level: 'error' });
      if (platform !== 'instagram' || hasSentLoginHint || !/private|login/i.test(text)) return;
      hasSentLoginHint = true;
      send('warning', { message: LOGIN_HINT });
    },
    lastError: () => lastError,
  };
}

export function failureMessage(lastError: string): string {
  return `The download failed. ${lastError || 'Check that the video is still available and try again.'}`;
}
