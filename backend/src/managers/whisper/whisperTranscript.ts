// "[00:00:00.000 --> 00:00:02.500]  Hello there."
const TIMESTAMP_PATTERN = /\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]\s*/g;

const SEGMENT_PATTERN = /^\[(\d{2,}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2,}):(\d{2}):(\d{2})\.(\d{3})\]\s*(.*)$/;

// one line whisper.cpp printed: when it starts and ends, in milliseconds, and what was said
export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
}

function toMs(hours: string, minutes: string, seconds: string, millis: string): number {
  return ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + Number(millis);
}

export function parseSegment(line: string): TranscriptSegment | null {
  const match = line.trim().match(SEGMENT_PATTERN);
  if (!match) return null;
  const [, startH = '', startM = '', startS = '', startMs = '', endH = '', endM = '', endS = '', endMs = '', text = ''] = match;
  const spoken = text.replace(/\s{2,}/g, ' ').trim();
  if (!spoken) return null;
  return { startMs: toMs(startH, startM, startS, startMs), endMs: toMs(endH, endM, endS, endMs), text: spoken };
}

// whisper's stdout without the lines that carry no timestamp or no words
export function parseSegments(rawText: string): TranscriptSegment[] {
  return rawText.split(/\r?\n/).flatMap((line) => parseSegment(line) ?? []);
}

// "[00:00.000 --> 00:02.500] Hello\n\nthere." -> "Hello there."
export function cleanTranscription(rawText: string): string {
  return rawText
    .replace(TIMESTAMP_PATTERN, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
