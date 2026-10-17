import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runWhisper } from './whisperRunner.ts';
import { cleanTranscription } from './whisperTranscript.ts';

import type { TranscriptionEvents } from '@shared/transcriptions.ts';
import type { EventSink } from '../../lib/sse.ts';
import type { FfmpegManager } from '../ffmpeg/ffmpegManager.ts';

export type TranscriptionEventSink = EventSink<Omit<TranscriptionEvents, 'done'>>;

export interface TranscribeFileInput {
  binaryPath: string;
  modelPath: string;
  inputPath: string;
  language: string;
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

// writes the transcript as a .txt beside the input: "clip.mp4" -> "clip.txt"
export async function transcribeFile(input: TranscribeFileInput): Promise<{ text: string; outputPath: string }> {
  const { binaryPath, modelPath, inputPath, language, send, signal } = input;
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
    const outputPath = `${inputPath.replace(/\.[^.]+$/, '')}.txt`;
    fs.writeFileSync(outputPath, text, 'utf8');
    return { text, outputPath };
  } finally {
    if (wavPath !== inputPath) fs.rmSync(wavPath, { force: true });
  }
}
