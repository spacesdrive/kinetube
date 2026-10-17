import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { createDownloadService } from '../../src/services/downloadService.ts';
import { createPendingDownloadStore } from '../../src/stores/pendingDownloadStore.ts';
import { createFakeFfmpeg, createFakeYtdlp } from '../fixtures/fakeManagers.ts';
import { makeTempPaths, removeDir } from '../fixtures/tempDir.ts';

import type { DownloadEvents, DownloadOptions } from '@shared/downloads.ts';
import type { StreamEvent } from '../../src/lib/sse.ts';
import type { DownloadService } from '../../src/services/downloadService.ts';
import type { PendingDownloadStore } from '../../src/stores/pendingDownloadStore.ts';
import type { FakeYtdlp } from '../fixtures/fakeManagers.ts';

const OPTIONS: DownloadOptions = {
  quality: '720p',
  isAudioOnly: false,
  outputDir: null,
  fileName: { prefix: '', suffix: '', template: '', sequenceNumber: null },
  account: null,
};
const TARGET = { platform: 'youtube' as const, cleanUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };

// starts the job without awaiting it, so the test can drive the fake yt-dlp while it runs
function startStream(job: ReturnType<DownloadService['create']>) {
  const events: StreamEvent<DownloadEvents>[] = [];
  const abort = new AbortController();
  const finished = job((...event) => events.push(event), abort.signal);
  const downloadId = (): string => {
    const start = events.find(([event]) => event === 'start');
    return start && 'download' in start[1] ? start[1].download.id : '';
  };
  return { events, abort, finished, downloadId };
}

describe('downloadService', () => {
  let root = '';
  let ytdlp: FakeYtdlp;
  let store: PendingDownloadStore;
  let service: DownloadService;

  beforeEach(() => {
    const paths = makeTempPaths();
    root = paths.root;
    ytdlp = createFakeYtdlp();
    store = createPendingDownloadStore(paths.pendingDownloadsFile);
    const environment = { ffmpeg: createFakeFfmpeg(), defaultDir: paths.downloadsDir };
    service = createDownloadService({ ytdlp, store, environment });
  });
  afterEach(() => removeDir(root));

  test('a finished download sends done with its file and leaves no pending record', async () => {
    const stream = startStream(service.create({ target: TARGET, options: OPTIONS }));
    assert.equal(service.list(null)[0]?.status, 'active');

    ytdlp.runs[0]?.emit('[download] Destination: /out/Clip [dQw4w9WgXcQ].mp4');
    ytdlp.runs[0]?.exit(0);
    await stream.finished;

    assert.deepEqual(stream.events.at(-1), ['done', { success: true, message: 'Download complete', title: 'Clip', filePath: '/out/Clip [dQw4w9WgXcQ].mp4' }]);
    assert.deepEqual(service.list(null), []);
  });

  test('starting the same download twice while it runs is refused with a conflict', async () => {
    const stream = startStream(service.create({ target: TARGET, options: OPTIONS }));
    assert.throws(() => service.create({ target: TARGET, options: OPTIONS }), { name: 'ConflictError' });

    ytdlp.runs[0]?.exit(0);
    await stream.finished;
  });

  test('a paused download keeps its record as paused and can be resumed under the same id', async () => {
    const first = startStream(service.create({ target: TARGET, options: OPTIONS }));
    const downloadId = first.downloadId();

    assert.equal(service.pause(downloadId).status, 'paused');
    await first.finished;
    assert.equal(first.events.at(-1)?.[0], 'paused');
    assert.equal(ytdlp.runs[0]?.isStopped, true);
    assert.equal(service.get(downloadId).status, 'paused');

    const second = startStream(service.resume(downloadId));
    assert.equal(service.get(downloadId).status, 'active');
    ytdlp.runs[1]?.exit(0);
    await second.finished;
    assert.deepEqual(service.list(null), []);
  });

  test('pausing a download that is not running is a conflict, and an unknown id is not found', () => {
    store.save({ id: 'aaaaaaaaaaaaaaaa', platform: 'youtube', url: TARGET.cleanUrl, title: '', options: OPTIONS, startedAt: '', pausedAt: null });
    assert.throws(() => service.pause('aaaaaaaaaaaaaaaa'), { name: 'ConflictError' });
    assert.throws(() => service.pause('bbbbbbbbbbbbbbbb'), { name: 'NotFoundError' });
  });

  test('a record nobody is running reads as interrupted, the case the resume banner offers', () => {
    store.save({ id: 'aaaaaaaaaaaaaaaa', platform: 'youtube', url: TARGET.cleanUrl, title: '', options: OPTIONS, startedAt: '', pausedAt: null });
    assert.equal(service.list('interrupted').length, 1);
    assert.equal(service.list('active').length, 0);
  });

  test('closing the stream cancels the download and forgets it', async () => {
    const stream = startStream(service.create({ target: TARGET, options: OPTIONS }));
    stream.abort.abort();
    await stream.finished;

    assert.equal(ytdlp.runs[0]?.isStopped, true);
    assert.deepEqual(stream.events.at(-1), ['done', { success: false, code: 'CANCELLED', message: 'Download cancelled' }]);
    assert.deepEqual(service.list(null), []);
  });

  test('a failed yt-dlp run reports its last error line', async () => {
    const stream = startStream(service.create({ target: TARGET, options: OPTIONS }));
    ytdlp.runs[0]?.emitError('ERROR: Video unavailable');
    ytdlp.runs[0]?.exit(1);
    await stream.finished;

    assert.deepEqual(stream.events.at(-1), ['done', { success: false, code: 'UPSTREAM_FAILED', message: 'The download failed. ERROR: Video unavailable' }]);
  });

  test('removing a download that does not exist is not found; removing a paused one dismisses it', () => {
    assert.throws(() => service.remove('bbbbbbbbbbbbbbbb'), { name: 'NotFoundError' });
    store.save({ id: 'aaaaaaaaaaaaaaaa', platform: 'youtube', url: TARGET.cleanUrl, title: '', options: OPTIONS, startedAt: '', pausedAt: 'x' });
    service.remove('aaaaaaaaaaaaaaaa');
    assert.deepEqual(service.list(null), []);
  });

  test('without yt-dlp installed nothing starts and the error says to finish setup', () => {
    ytdlp.installed = false;
    assert.throws(() => service.create({ target: TARGET, options: OPTIONS }), { name: 'ToolNotInstalledError' });
  });
});
