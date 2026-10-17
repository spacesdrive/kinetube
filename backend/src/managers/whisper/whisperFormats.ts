import type { TranscriptFiles, TranscriptFormat } from '@shared/transcriptions.ts';
import type { TranscriptSegment } from './whisperTranscript.ts';

export const TRANSCRIPT_FORMATS: readonly TranscriptFormat[] = ['txt', 'srt', 'vtt', 'lrc', 'csv', 'tsv', 'json'];

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

// 3723004 -> "01:02:03,004" for SRT, "01:02:03.004" for VTT
export function clockTime(ms: number, separator: ',' | '.'): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor(ms / 60_000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(ms % 1000, 3)}`;
}

// LRC counts minutes past 59 instead of hours, in hundredths: 3723004 -> "62:03.00"
function lyricTime(ms: number): string {
  const centis = Math.floor(ms / 10);
  return `${pad(Math.floor(centis / 6000))}:${pad(Math.floor(centis / 100) % 60)}.${pad(centis % 100)}`;
}

function csvField(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
}

const RENDERERS: Record<TranscriptFormat, (segments: TranscriptSegment[], paragraph: string) => string> = {
  txt: (_segments, paragraph) => `${paragraph}\n`,
  srt: (segments) => segments.map((segment, index) => `${index + 1}\n${clockTime(segment.startMs, ',')} --> ${clockTime(segment.endMs, ',')}\n${segment.text}\n`).join('\n'),
  vtt: (segments) => ['WEBVTT\n', ...segments.map((segment) => `${clockTime(segment.startMs, '.')} --> ${clockTime(segment.endMs, '.')}\n${segment.text}\n`)].join('\n'),
  lrc: (segments) => segments.map((segment) => `[${lyricTime(segment.startMs)}]${segment.text}\n`).join(''),
  // the data formats keep milliseconds, as whisper.cpp's own CSV and OpenAI Whisper's TSV do
  csv: (segments) => ['start,end,text\n', ...segments.map((segment) => `${segment.startMs},${segment.endMs},${csvField(segment.text)}\n`)].join(''),
  tsv: (segments) => ['start\tend\ttext\n', ...segments.map((segment) => `${segment.startMs}\t${segment.endMs}\t${segment.text.replace(/\t/g, ' ')}\n`)].join(''),
  // JSON uses seconds, like OpenAI Whisper's JSON output
  json: (segments, paragraph) => `${JSON.stringify({ text: paragraph, segments: segments.map(({ startMs, endMs, text }) => ({ start: startMs / 1000, end: endMs / 1000, text })) }, null, 2)}\n`,
};

export function renderTranscripts(segments: TranscriptSegment[], paragraph: string): TranscriptFiles {
  const render = (format: TranscriptFormat): string => RENDERERS[format](segments, paragraph);
  return { txt: render('txt'), srt: render('srt'), vtt: render('vtt'), lrc: render('lrc'), csv: render('csv'), tsv: render('tsv'), json: render('json') };
}
