export interface ParsedEvent {
  event: string;
  data: unknown;
}

// "event: start\ndata: {...}\n\n" blocks -> [{ event: 'start', data: {...} }]; keepalive comments are skipped
export function parseSseBody(body: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  for (const block of body.split('\n\n')) {
    const eventLine = block.split('\n').find((line) => line.startsWith('event: '));
    const dataLine = block.split('\n').find((line) => line.startsWith('data: '));
    if (!eventLine || !dataLine) continue;
    events.push({ event: eventLine.slice('event: '.length), data: JSON.parse(dataLine.slice('data: '.length)) });
  }
  return events;
}
