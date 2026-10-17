import { sendRequest, toApiError } from './request';

import type { StreamDone } from '@shared/api.ts';

// one [name, data] pair per event, so a handler narrows the data by checking the name
export type StreamEvent<Events> = { [K in keyof Events & string]: [event: K, data: Events[K]] }[keyof Events & string];

export type StreamHandler<Events> = (...event: StreamEvent<Events>) => void;

export interface StreamHandle {
  // stops the work on the backend too: closing a download stream cancels the download
  close(): void;
  finished: Promise<void>;
}

type DoneFailure = Extract<StreamDone, { success: false }>;

const CUT_OFF_MESSAGE = 'The connection to the backend closed before the work finished. Try again.';

// "event: progress\ndata: {...}" -> ['progress', {...}]; keepalive comments and broken JSON are skipped
export function parseEventBlock(block: string): [string, unknown] | null {
  let eventName = '';
  let dataText = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event: ')) eventName = line.slice('event: '.length).trim();
    else if (line.startsWith('data: ')) dataText += line.slice('data: '.length);
  }
  if (!eventName || !dataText) return null;

  try {
    return [eventName, JSON.parse(dataText)];
  } catch {
    return null;
  }
}

async function readBlocks(body: ReadableStream<Uint8Array>, onBlock: (block: string) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffered += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const blocks = buffered.split('\n\n');
    buffered = blocks.pop() ?? '';
    blocks.forEach(onBlock);
  }
  if (buffered.trim()) onBlock(buffered);
}

// fetch-based server-sent events that can POST a body; endEvents lists every event that can end a stream, such as paused
export function openStream<Events extends { done: StreamDone<object> }>(
  path: string,
  init: RequestInit,
  onEvent: StreamHandler<Events>,
  endEvents: readonly (keyof Events & string)[] = ['done'],
): StreamHandle {
  const abort = new AbortController();
  const endNames: readonly string[] = endEvents;
  let hasEnded = false;

  // every StreamDone<T> has this failure branch, so it fits the done event of any stream
  const emit = onEvent as unknown as (event: string, data: unknown) => void;
  const fail = (failure: DoneFailure): void => emit('done', failure);

  async function run(): Promise<void> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'text/event-stream');
    const response = await sendRequest(path, { ...init, headers, signal: abort.signal });
    if (!response.ok || !response.body) {
      const error = await toApiError(response);
      fail({ success: false, code: error.code === 'NETWORK' ? 'INTERNAL' : error.code, message: error.message });
      return;
    }

    await readBlocks(response.body, (block) => {
      const parsed = parseEventBlock(block);
      if (!parsed) return;
      if (endNames.includes(parsed[0])) hasEnded = true;
      emit(parsed[0], parsed[1]);
    });
    if (!hasEnded) fail({ success: false, code: 'INTERNAL', message: CUT_OFF_MESSAGE });
  }

  const finished = run().catch((error: unknown) => {
    if (abort.signal.aborted) return;
    fail({ success: false, code: 'INTERNAL', message: error instanceof Error ? error.message : CUT_OFF_MESSAGE });
  });

  return { close: () => abort.abort(), finished };
}
