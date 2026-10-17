import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { renderTranscripts } from './whisperFormats.ts';
import { runWhisper } from './whisperRunner.ts';
import { cleanTranscription, parseSegments } from './whisperTranscript.ts';

import type { TranscriptFiles, TranscriptFormat, TranscriptionEvents } from '@shared/transcriptions.ts';
import type { EventSink } from '../../lib/sse.ts';
import type { FfmpegManager } from '../ffmpeg/ffmpegManager.ts';

export type TranscriptionEventSink = EventSink<Omit<TranscriptionEvents, 'done'>>;

export interface TranscribeFileInput {
  binaryPath: string;
  modelPath: string;
  inputPath: string;
  language: string;
  // the files written beside the input; none for an uploaded copy
  formats: readonly TranscriptFormat[];
  ffmpeg: FfmpegManager;
  send: TranscriptionEventSink;
  signal?: AbortSignal;
}

async function toWav({ inputPath, ffmpeg, send, signal }: TranscribeFileInput): Promise<string> {
  if (path.extname(inputPath).toLowerCase() === '.wav') return inputPath;
  if (!ffmpeg.isInstalled()) throw new Error('FFmpeg is needed to read this file. Install it from the setup screen, then try again.');

  send('phase', { phase: 'extracting', message: 'Extracting audio...' });
  const wavPath = path.join(os.tmpdir(), `kinetube-whisper-${Date.now()}.wav`);
  await ffmpeg.extractAudio(inputPath, wavPath, signal);
  return wavPath;
}

export interface TranscriptResult {
  text: string;
  transcripts: TranscriptFiles;
  outputPaths: string[];
}

// "clip.mp4" with ["txt", "srt"] -> "clip.txt" and "clip.srt" beside it
function writeTranscripts(inputPath: string, transcripts: TranscriptFiles, formats: readonly TranscriptFormat[]): string[] {
  const { dir, name } = path.parse(inputPath);
  return formats.map((format) => {
    const outputPath = path.join(dir, `${name}.${format}`);
    fs.writeFileSync(outputPath, transcripts[format], 'utf8');
    return outputPath;
  });
}

export async function transcribeFile(input: TranscribeFileInput): Promise<TranscriptResult> {
  const { binaryPath, modelPath, inputPath, language, formats, send, signal } = input;
  const wavPath = await toWav(input);

  try {
    send('phase', { phase: 'transcribing', message: 'Transcribing...' });
    const rawText = await runWhisper({
      binaryPath,
      modelPath,
      wavPath,
      language,
      signal,
      onPercent: (percent) => send('progress', { percent }),
      onText: (text) => send('chunk', { text }),
    });

    const text = cleanTranscription(rawText);
    const transcripts = renderTranscripts(parseSegments(rawText), text);
    return { text, transcripts, outputPaths: writeTranscripts(inputPath, transcripts, formats) };
  } finally {
    if (wavPath !== inputPath) fs.rmSync(wavPath, { force: true });
  }
}
