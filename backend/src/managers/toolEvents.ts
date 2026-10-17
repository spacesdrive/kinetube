import type { ToolInstallEvents } from '@shared/tools.ts';
import type { EventSink } from '../lib/sse.ts';

// managers report phases and progress; the service that owns the stream sends the final done event
export type ToolEventSink = EventSink<Omit<ToolInstallEvents, 'done'>>;
