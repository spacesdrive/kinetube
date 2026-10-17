import { afterEach, describe, expect, it, vi } from 'vitest';

import { openStream, parseEventBlock } from '@/services/eventStream';

import type { StreamDone } from '@shared/api.ts';

interface TestEvents {
  progress: { percent: number };
  done: StreamDone<{ filePath: string }>;
}

function streamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

async function collect(response: Response): Promise<unknown[][]> {
  vi.stubGlobal('fetch', vi.fn(async () => response));
  const events: unknown[][] = [];
  await openStream<TestEvents>('/work', { method: 'POST' }, (...event) => events.push(event)).finished;
  return events;
}

afterEach(() => vi.unstubAllGlobals());

describe('parseEventBlock', () => {
  it('reads the event name and its JSON data', () => {
    expect(parseEventBlock('event: progress\ndata: {"percent":5}')).toEqual(['progress', { percent: 5 }]);
  });

  it('skips keepalive comments and broken JSON', () => {
    expect(parseEventBlock(': keepalive')).toBeNull();
    expect(parseEventBlock('event: progress\ndata: {oops')).toBeNull();
  });
});

describe('openStream', () => {
  it('delivers events even when one is split across two chunks', async () => {
    const events = await collect(streamResponse(['event: progress\ndata: {"perc', 'ent":40}\n\n', 'event: done\ndata: {"success":true,"message":"ok","filePath":"/a"}\n\n']));
    expect(events).toEqual([
      ['progress', { percent: 40 }],
      ['done', { success: true, message: 'ok', filePath: '/a' }],
    ]);
  });

  it("turns a JSON error answer into a failed done event with the backend's message", async () => {
    const answer = new Response(JSON.stringify({ success: false, code: 'CONFLICT', message: 'Already running.', requestId: 'r1' }), { status: 409 });
    expect(await collect(answer)).toEqual([['done', { success: false, code: 'CONFLICT', message: 'Already running.' }]]);
  });

  it('reports a stream that ends without done, so the person is never left waiting', async () => {
    const events = await collect(streamResponse(['event: progress\ndata: {"percent":10}\n\n']));
    expect(events.at(-1)?.[0]).toBe('done');
    expect(events.at(-1)?.[1]).toMatchObject({ success: false });
  });

  it('treats a listed end event as the end, so a paused download is not reported as failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamResponse(['event: paused\ndata: {"download":{}}\n\n'])));
    const events: unknown[][] = [];
    const onEvent = (...event: unknown[]): number => events.push(event);
    await openStream<TestEvents & { paused: object }>('/work', { method: 'POST' }, onEvent, ['done', 'paused']).finished;
    expect(events).toEqual([['paused', { download: {} }]]);
  });

  it('sends Accept: text/event-stream so the backend picks the stream representation', async () => {
    const fetchMock = vi.fn(async () => streamResponse(['event: done\ndata: {"success":true,"message":"ok","filePath":""}\n\n']));
    vi.stubGlobal('fetch', fetchMock);
    await openStream<TestEvents>('/work', {}, () => {}).finished;
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(new Headers(init.headers).get('Accept')).toBe('text/event-stream');
  });
});
