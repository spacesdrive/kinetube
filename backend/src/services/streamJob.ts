import type { EventSink } from '../lib/sse.ts';

// work a service returns once its checks pass; it sends its own done event, and signal fires when the stream closes
export type StreamJob<Events> = (send: EventSink<Events>, signal: AbortSignal) => Promise<void>;
