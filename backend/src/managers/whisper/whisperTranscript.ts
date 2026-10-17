// "[00:00:00.000 --> 00:00:02.500]  Hello there."
const TIMESTAMP_PATTERN = /\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]\s*/g;

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
