import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import { ToolNotInstalledError, UpstreamTimeoutError, ValidationError } from '../../src/lib/errors.ts';
import { createYouTubeMediaService, LIST_TIMEOUT_MS, VIDEO_TIMEOUT_MS } from '../../src/services/youtubeMediaService.ts';
import { createFakeYtdlp } from '../fixtures/fakeManagers.ts';
import { PLAYLIST_SAMPLE } from '../fixtures/youtubeSamples.ts';

import type { YouTubeMediaService } from '../../src/services/youtubeMediaService.ts';
import type { FakeYtdlp } from '../fixtures/fakeManagers.ts';

const PLAYLIST_LINK = 'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';

function answerWith(ytdlp: FakeYtdlp, json: unknown): void {
  ytdlp.metadata = { exitCode: 0, stdout: JSON.stringify(json), stderr: '', isTimedOut: false };
}

describe('youtubeMediaService', () => {
  let ytdlp: FakeYtdlp;
  let service: YouTubeMediaService;

  beforeEach(() => {
    ytdlp = createFakeYtdlp();
    service = createYouTubeMediaService(ytdlp);
  });

  test('a playlist is listed flat with the long timeout and comes back as a playlist', async () => {
    answerWith(ytdlp, PLAYLIST_SAMPLE);
    const media = await service.get(PLAYLIST_LINK);

    const call = ytdlp.metadataCalls[0];
    assert.ok(call);
    assert.ok(call.args.includes('--flat-playlist') && call.args.includes('--dump-single-json'));
    assert.deepEqual(call.args.slice(-2), ['--', PLAYLIST_LINK]);
    assert.equal(call.timeoutMs, LIST_TIMEOUT_MS);
    assert.equal(media.kind, 'playlist');
  });

  test('a channel tab is listed flat with the long timeout', async () => {
    answerWith(ytdlp, { channel: 'NASA', entries: [] });
    const media = await service.get('https://www.youtube.com/@NASA/streams');

    const call = ytdlp.metadataCalls[0];
    assert.ok(call);
    assert.ok(call.args.includes('--flat-playlist'));
    assert.equal(call.timeoutMs, LIST_TIMEOUT_MS);
    assert.equal(media.kind === 'channel' ? media.tab : null, 'streams');
  });

  test('a watch link inside a playlist opens only the video, with the short timeout', async () => {
    answerWith(ytdlp, { id: 'dQw4w9WgXcQ', title: 'Clip' });
    const media = await service.get('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');

    const call = ytdlp.metadataCalls[0];
    assert.ok(call);
    assert.ok(call.args.includes('-J') && !call.args.includes('--flat-playlist'));
    assert.deepEqual(call.args.slice(-2), ['--', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
    assert.equal(call.timeoutMs, VIDEO_TIMEOUT_MS);
    assert.equal(media.kind === 'video' ? media.playlistUrl : null, PLAYLIST_LINK);
  });

  test('a link that is not from YouTube is refused before yt-dlp runs', async () => {
    await assert.rejects(service.get('https://vimeo.com/1'), (error: unknown) => error instanceof ValidationError && /playlist/.test(error.message));
    assert.equal(ytdlp.metadataCalls.length, 0);
  });

  test('a playlist without yt-dlp installed says to finish setup', async () => {
    ytdlp.installed = false;
    await assert.rejects(service.get(PLAYLIST_LINK), ToolNotInstalledError);
  });

  test('a playlist that takes too long is a timeout error', async () => {
    ytdlp.metadata = { exitCode: null, stdout: '', stderr: '', isTimedOut: true };
    await assert.rejects(service.get(PLAYLIST_LINK), UpstreamTimeoutError);
  });
});
