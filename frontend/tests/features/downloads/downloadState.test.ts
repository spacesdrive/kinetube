import { describe, expect, it } from 'vitest';

import { applyBatchEvent, createBulkDownload, summarizeBulk } from '@/features/downloads/bulkDownloadState';
import { applyDownloadEvent, createSingleDownload, scaledPercent } from '@/features/downloads/singleDownloadState';

import type { Download } from '@shared/downloads.ts';

const RECORD: Download = {
  id: 'abc',
  platform: 'youtube',
  url: 'https://youtu.be/x',
  title: '',
  status: 'active',
  options: { quality: 'best', isAudioOnly: false, outputDir: null, fileName: { prefix: '', suffix: '', template: '', sequenceNumber: null }, account: null },
  startedAt: '',
  pausedAt: null,
};

describe('scaledPercent', () => {
  it('fills the first half with video and most of the second with audio, so the bar never goes back', () => {
    expect(scaledPercent(100, 'video', true)).toBe(50);
    expect(scaledPercent(100, 'audio', true)).toBe(95);
    expect(scaledPercent(30, 'merging', true)).toBe(97);
    expect(scaledPercent(30, 'video', false)).toBe(30);
  });
});

describe('applyDownloadEvent', () => {
  it('remembers the id from start, so Pause can reach this download', () => {
    const state = applyDownloadEvent(createSingleDownload('Clip', 'best', false), 'start', { download: RECORD, willMerge: true });
    expect(state.downloadId).toBe('abc');
    expect(state.isMultiFile).toBe(true);
  });

  it('a paused event leaves the download resumable and labelled Paused', () => {
    const state = applyDownloadEvent(createSingleDownload('Clip', 'best', false), 'paused', { download: { ...RECORD, status: 'paused' } });
    expect(state.status).toBe('paused');
    expect(state.phaseLabel).toBe('Paused');
  });

  it('a successful done fills the bar and keeps the saved file path for transcription', () => {
    const state = applyDownloadEvent(createSingleDownload('Clip', 'best', false), 'done', { success: true, message: 'Download complete', title: 'Clip', filePath: '/out/Clip.mp4' });
    expect(state).toMatchObject({ status: 'done', isSuccess: true, percent: 100, filePath: '/out/Clip.mp4' });
  });

  it('a failed done shows its message and keeps the progress where it stopped', () => {
    let state = applyDownloadEvent(createSingleDownload('Clip', 'best', false), 'progress', { percent: 40, speed: '', eta: '', title: 'Clip', phase: 'video', isMultiFile: false });
    state = applyDownloadEvent(state, 'done', { success: false, code: 'UPSTREAM_FAILED', message: 'The download failed.' });
    expect(state).toMatchObject({ status: 'done', isSuccess: false, percent: 40, message: 'The download failed.' });
  });
});

describe('bulk downloads', () => {
  const items = [
    { key: 'a', url: 'https://youtu.be/a', title: 'A', platform: 'youtube' as const, shouldTranscribe: false },
    { key: 'b', url: 'https://youtu.be/b', title: 'B', platform: 'youtube' as const, shouldTranscribe: true },
  ];

  it('tracks which item runs and counts successes and failures', () => {
    let state = createBulkDownload(items);
    state = applyBatchEvent(state, 'itemStart', { index: 0, url: 'https://youtu.be/a', title: 'A' });
    expect(summarizeBulk(state).current?.key).toBe('a');

    state = applyBatchEvent(state, 'itemDone', { index: 0, isSuccess: true, filePath: '/a.mp4', message: null, transcriptPaths: [], transcriptError: null });
    state = applyBatchEvent(state, 'itemDone', { index: 1, isSuccess: false, filePath: null, message: 'Private video', transcriptPaths: [], transcriptError: null });
    expect(summarizeBulk(state)).toMatchObject({ total: 2, doneCount: 2, succeededCount: 1, failedCount: 1, current: null });
  });

  it('an item stays current while it transcribes, and only counts as done once its transcript is written', () => {
    let state = createBulkDownload(items);
    state = applyBatchEvent(state, 'itemStart', { index: 1, url: 'https://youtu.be/b', title: 'B' });
    state = applyBatchEvent(state, 'itemProgress', { index: 1, percent: 100 });
    state = applyBatchEvent(state, 'itemTranscribing', { index: 1 });
    state = applyBatchEvent(state, 'itemTranscribeProgress', { index: 1, percent: 40 });
    expect(summarizeBulk(state)).toMatchObject({ doneCount: 0, transcribedCount: 0, hasTranscripts: true });
    expect(summarizeBulk(state).current).toMatchObject({ key: 'b', status: 'transcribing', percent: 40 });

    state = applyBatchEvent(state, 'itemDone', { index: 1, isSuccess: true, filePath: '/b.mp4', message: null, transcriptPaths: ['/b.txt', '/b.srt'], transcriptError: null });
    expect(summarizeBulk(state)).toMatchObject({ doneCount: 1, transcribedCount: 1, current: null });
    expect(state.items[1]?.transcriptPaths).toEqual(['/b.txt', '/b.srt']);
  });

  it('a done event marks the whole batch finished, cancelled or not', () => {
    const state = applyBatchEvent(createBulkDownload(items), 'done', { success: false, code: 'CANCELLED', message: 'Batch download cancelled' });
    expect(state.isFinished).toBe(true);
  });
});
