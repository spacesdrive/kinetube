import { AppError, UNEXPECTED_ERROR_MESSAGE } from '../lib/errors.ts';
import { openEventStream } from '../lib/sse.ts';

import type { Request, Response } from 'express';
import type { DataResponse, ListResponse, StreamDone } from '@shared/api.ts';
import type { Logger } from '../lib/logger.ts';
import type { EventSink } from '../lib/sse.ts';
import type { StreamJob } from '../services/streamJob.ts';

export type Handler = (req: Request, res: Response) => Promise<void> | void;

export function dataResponse<T>(data: T): DataResponse<T> {
  return { data };
}

export function listResponse<T>(items: T[]): ListResponse<T> {
  return { data: items, total: items.length };
}

type DoneFailure = Extract<StreamDone, { success: false }>;

function toFailure(error: unknown): DoneFailure {
  if (error instanceof AppError) return { success: false, code: error.code, message: error.message };
  return { success: false, code: 'INTERNAL', message: UNEXPECTED_ERROR_MESSAGE };
}

// runs a job on an event stream; anything it throws after the stream opened becomes a failed done event
export async function sendStream<Events extends { done: StreamDone<object> }>(
  req: Request,
  res: Response,
  logger: Logger,
  job: StreamJob<Events>,
): Promise<void> {
  const stream = openEventStream<Events>(res);
  const abort = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) abort.abort();
  });

  try {
    await job(stream.send, abort.signal);
  } catch (error) {
    logger.error('A stream failed', { method: req.method, path: req.path, requestId: res.locals.requestId, error });
    // every StreamDone<T> has this failure branch, so it fits the done event of any stream
    const sendDone = stream.send as unknown as EventSink<{ done: DoneFailure }>;
    sendDone('done', toFailure(error));
  } finally {
    stream.close();
  }
}
