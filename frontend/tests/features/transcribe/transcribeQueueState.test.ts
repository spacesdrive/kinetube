import { describe, expect, it } from 'vitest';

import { applyTranscriptionEvent, isWaiting, itemFromPath } from '@/features/transcribe/transcribeQueueState';

import type { TranscriptFiles } from '@shared/transcriptions.ts';

// every format of a short transcript, as the backend sends them
const TRANSCRIPTS: TranscriptFiles = {
  txt: 'Hello there.\n',
  srt: '1\n00:00:00,000 --> 00:00:01,000\nHello there.\n',
  vtt: 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello there.\n',
  lrc: '[00:00.00]Hello there.\n',
  csv: 'start,end,text\n0,1000,"Hello there."\n',
  tsv: 'start\tend\ttext\n0\t1000\tHello there.\n',
  json: '{}\n',
};

describe('transcription queue items', () => {
  it('names a typed path after its file', () => {
    expect(itemFromPath('C:\\Videos\\clip.mp4').name).toBe('clip.mp4');
    expect(itemFromPath('/home/me/talk.wav').name).toBe('talk.wav');
  });

  it('builds up the text from chunks, then keeps the final text from done', () => {
    let item = itemFromPath('/a.mp4');
    item = applyTranscriptionEvent(item, 'chunk', { text: 'Hello' });
    item = applyTranscriptionEvent(item, 'chunk', { text: 'there.' });
    expect(item.text).toBe('Hello there.');

    item = applyTranscriptionEvent(item, 'done', { success: true, message: 'done', text: 'Hello there.', transcripts: TRANSCRIPTS, outputPaths: ['/a.txt'] });
    expect(item).toMatchObject({ status: 'done', percent: 100, transcripts: TRANSCRIPTS, outputPaths: ['/a.txt'] });
  });

  it('a new item has no transcript to save yet', () => {
    expect(itemFromPath('/a.mp4')).toMatchObject({ transcripts: null, outputPaths: [] });
  });

  it('a failed item can be tried again', () => {
    const failed = applyTranscriptionEvent(itemFromPath('/a.mp4'), 'done', { success: false, code: 'UPSTREAM_FAILED', message: 'FFmpeg failed' });
    expect(failed.error).toBe('FFmpeg failed');
    expect(isWaiting(failed)).toBe(true);
  });
});
