import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ytdlpAssetName, ytdlpBinaryName, ytdlpDownloadUrl } from '../../../src/managers/ytdlp/ytdlpBinary.ts';

describe('yt-dlp per platform', () => {
  test('each platform downloads its own release asset', () => {
    assert.equal(ytdlpAssetName('win32'), 'yt-dlp.exe');
    assert.equal(ytdlpAssetName('darwin'), 'yt-dlp_macos');
    assert.equal(ytdlpAssetName('linux'), 'yt-dlp_linux');
  });

  test('a platform without a managed binary is refused by name', () => {
    assert.throws(() => ytdlpAssetName('freebsd'), /no managed binary for platform "freebsd"/);
  });

  test('only Windows gives the binary an .exe name', () => {
    assert.equal(ytdlpBinaryName('win32'), 'yt-dlp.exe');
    assert.equal(ytdlpBinaryName('darwin'), 'yt-dlp');
    assert.equal(ytdlpBinaryName('linux'), 'yt-dlp');
  });

  test('the download link points at the pinned release unless another version is asked for', () => {
    assert.equal(ytdlpDownloadUrl('darwin'), 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.03.17/yt-dlp_macos');
    assert.equal(ytdlpDownloadUrl('linux', '2026.09.01'), 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.09.01/yt-dlp_linux');
  });
});
