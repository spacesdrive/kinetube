import type { TranscriptFormat } from '@shared/transcriptions.ts';

export const TRANSCRIPT_FORMATS: readonly TranscriptFormat[] = ['txt', 'srt', 'vtt', 'lrc', 'csv', 'tsv', 'json'];

export const TRANSCRIPT_FORMAT_LABELS: Record<TranscriptFormat, string> = {
  txt: 'Text (.txt)',
  srt: 'Subtitles (.srt)',
  vtt: 'Web subtitles (.vtt)',
  lrc: 'Lyrics (.lrc)',
  csv: 'Spreadsheet (.csv)',
  tsv: 'Tab separated (.tsv)',
  json: 'JSON (.json)',
};

export function isTranscriptFormat(value: unknown): value is TranscriptFormat {
  return TRANSCRIPT_FORMATS.some((format) => format === value);
}

// ["C:\Videos\clip.txt", "C:\Videos\clip.srt"] -> ["txt", "srt"]
export function formatsOfFiles(filePaths: readonly string[]): TranscriptFormat[] {
  return filePaths.map((filePath) => filePath.split('.').pop()).filter(isTranscriptFormat);
}

// ["srt", "txt"] -> "TXT and SRT", in the order of the list above
export function formatList(formats: readonly TranscriptFormat[]): string {
  const names = TRANSCRIPT_FORMATS.filter((format) => formats.includes(format)).map((format) => format.toUpperCase());
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

// a stored list from an older version or a hand edit keeps only the formats that exist, and never ends up empty
export function cleanFormats(value: unknown): TranscriptFormat[] {
  const formats = Array.isArray(value) ? TRANSCRIPT_FORMATS.filter((format) => value.includes(format)) : [];
  return formats.length > 0 ? formats : ['txt'];
}
