import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildDownloadArgs, buildMetadataArgs } from '../../../src/managers/ytdlp/ytdlpArgs.ts';
import { formatSelector, qualityNeedsMerge } from '../../../src/managers/ytdlp/ytdlpFormats.ts';

const BASE_INPUT = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  outputTemplate: '/out/%(title)s.%(ext)s',
  quality: '720p' as const,
  isAudioOnly: false,
  ffmpegDir: null,
  cookiesPath: null,
  sleepSeconds: null,
};

describe('buildDownloadArgs', () => {
  test('the link always comes after "--", so it can never be read as an option', () => {
    const args = buildDownloadArgs({ ...BASE_INPUT, url: '--exec=calc' });
    assert.deepEqual(args.slice(-2), ['--', '--exec=calc']);
  });

  test('a video download merges into mp4 using the quality selector', () => {
    const args = buildDownloadArgs(BASE_INPUT);
    assert.equal(args[args.indexOf('-f') + 1], formatSelector('720p', false));
    assert.ok(args.includes('--merge-output-format'));
    assert.ok(!args.includes('-x'));
  });

  test('an audio-only download extracts the best quality mp3', () => {
    const args = buildDownloadArgs({ ...BASE_INPUT, isAudioOnly: true });
    assert.deepEqual(args.slice(args.indexOf('-x'), args.indexOf('-x') + 5), ['-x', '--audio-format', 'mp3', '--audio-quality', '0']);
  });

  test('TLS certificates are always checked', () => {
    assert.ok(!buildDownloadArgs(BASE_INPUT).includes('--no-check-certificates'));
    assert.ok(!buildDownloadArgs({ ...BASE_INPUT, isAudioOnly: true, cookiesPath: '/s/c' }).includes('--no-check-certificates'));
  });

  test('cookies, FFmpeg and request pacing are passed only when given', () => {
    const bare = buildDownloadArgs(BASE_INPUT);
    assert.ok(!bare.includes('--cookies') && !bare.includes('--ffmpeg-location') && !bare.includes('--sleep-requests'));

    const full = buildDownloadArgs({ ...BASE_INPUT, cookiesPath: '/s/session-me', ffmpegDir: '/tools', sleepSeconds: 2 });
    assert.equal(full[full.indexOf('--cookies') + 1], '/s/session-me');
    assert.equal(full[full.indexOf('--ffmpeg-location') + 1], '/tools');
    assert.equal(full[full.indexOf('--sleep-requests') + 1], '2');
  });
});

describe('buildMetadataArgs', () => {
  test('a channel is listed flat in one JSON document; a video uses -J', () => {
    const channel = buildMetadataArgs({ url: 'u', isPlaylist: true, ffmpegDir: null, cookiesPath: null });
    assert.ok(channel.includes('--flat-playlist') && channel.includes('--dump-single-json'));
    assert.ok(buildMetadataArgs({ url: 'u', isPlaylist: false, ffmpegDir: null, cookiesPath: null }).includes('-J'));
  });

  test('a metadata lookup checks TLS certificates and ends with the link', () => {
    for (const isPlaylist of [true, false]) {
      const args = buildMetadataArgs({ url: 'https://www.youtube.com/playlist?list=PLx', isPlaylist, ffmpegDir: null, cookiesPath: null });
      assert.ok(!args.includes('--no-check-certificates'));
      assert.deepEqual(args.slice(-2), ['--', 'https://www.youtube.com/playlist?list=PLx']);
    }
  });
});

describe('formats', () => {
  test('qualities above 720p need FFmpeg to merge and lower ones do not', () => {
    assert.equal(qualityNeedsMerge('1080p'), true);
    assert.equal(qualityNeedsMerge('best'), true);
    assert.equal(qualityNeedsMerge('720p'), false);
  });

  test('audio-only ignores the chosen quality', () => {
    assert.equal(formatSelector('2160p', true), formatSelector('360p', true));
  });
});
