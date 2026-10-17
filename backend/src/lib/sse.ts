import type { Response } from 'express';

// one [name, data] pair per event; as a rest tuple union, a sink for every event also fits a subset of them
export type StreamEvent<Events> = { [K in keyof Events & string]: [event: K, data: Events[K]] }[keyof Events & string];

export type EventSink<Events> = (...args: StreamEvent<Events>) => void;

export interface EventStream<Events> {
  send: EventSink<Events>;
  close(): void;
  isClosed(): boolean;
}

// a comment line every 15 seconds keeps idle proxies and sockets from dropping a long download
const KEEP_ALIVE_MS = 15_000;

export function openEventStream<Events>(res: Response): EventStream<Events> {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.socket?.setNoDelay(true);

  const isClosed = (): boolean => res.writableEnded || res.destroyed;

  const keepAlive = setInterval(() => {
    if (!isClosed()) res.write(': keepalive\n\n');
  }, KEEP_ALIVE_MS);
  res.on('close', () => clearInterval(keepAlive));

  return {
    send(...[event, data]) {
      if (isClosed()) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      clearInterval(keepAlive);
      if (!res.writableEnded) res.end();
    },
    isClosed,
  };
}
