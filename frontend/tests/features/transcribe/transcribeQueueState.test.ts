import { describe, expect, it } from 'vitest';

import { applyTranscriptionEvent, isWaiting, itemFromPath } from '@/features/transcribe/transcribeQueueState';

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

    item = applyTranscriptionEvent(item, 'done', { success: true, message: 'done', text: 'Hello there.', outputPath: '/a.txt' });
    expect(item).toMatchObject({ status: 'done', percent: 100 });
  });

  it('a failed item can be tried again', () => {
    const failed = applyTranscriptionEvent(itemFromPath('/a.mp4'), 'done', { success: false, code: 'UPSTREAM_FAILED', message: 'FFmpeg failed' });
    expect(failed.error).toBe('FFmpeg failed');
    expect(isWaiting(failed)).toBe(true);
  });
});
