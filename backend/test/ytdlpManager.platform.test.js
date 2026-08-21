const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  getYtdlpAssetName,
  getYtdlpBinaryName,
  getYtdlpDownloadUrl,
  getFfmpegBinaryName,
  getFfmpegDownloadInfo,
  isNewerYtdlpVersion,
} = require('../utils/ytdlpManager');

describe('yt-dlp platform resolution', () => {
  test('resolves the correct release asset name per platform', () => {
    assert.equal(getYtdlpAssetName('win32'), 'yt-dlp.exe');
    assert.equal(getYtdlpAssetName('darwin'), 'yt-dlp_macos');
    assert.equal(getYtdlpAssetName('linux'), 'yt-dlp_linux');
  });

  test('throws for a platform with no managed binary', () => {
    assert.throws(() => getYtdlpAssetName('freebsd'), /no managed binary/);
  });

  test('resolves the local binary name per platform (.exe only on Windows)', () => {
    assert.equal(getYtdlpBinaryName('win32'), 'yt-dlp.exe');
    assert.equal(getYtdlpBinaryName('darwin'), 'yt-dlp');
    assert.equal(getYtdlpBinaryName('linux'), 'yt-dlp');
  });

  test('builds a pinned-version GitHub release URL using the platform asset name', () => {
    assert.equal(
      getYtdlpDownloadUrl('darwin'),
      'https://github.com/yt-dlp/yt-dlp/releases/download/2026.03.17/yt-dlp_macos',
    );
    assert.equal(
      getYtdlpDownloadUrl('linux'),
      'https://github.com/yt-dlp/yt-dlp/releases/download/2026.03.17/yt-dlp_linux',
    );
    assert.equal(
      getYtdlpDownloadUrl('win32'),
      'https://github.com/yt-dlp/yt-dlp/releases/download/2026.03.17/yt-dlp.exe',
    );
  });
});

describe('yt-dlp version comparison', () => {
  test('a numerically greater calendar version is newer', () => {
    assert.equal(isNewerYtdlpVersion('2026.08.19', '2026.03.17'), true);
    assert.equal(isNewerYtdlpVersion('2026.03.17', '2026.08.19'), false);
  });

  test('compares parts numerically, not as strings ("10" > "9")', () => {
    assert.equal(isNewerYtdlpVersion('2026.3.10', '2026.3.9'), true);
    assert.equal(isNewerYtdlpVersion('2026.3.9', '2026.3.10'), false);
  });

  test('identical versions are not "newer"', () => {
    assert.equal(isNewerYtdlpVersion('2026.03.17', '2026.03.17'), false);
  });

  test('a patch suffix makes a version newer than its base', () => {
    assert.equal(isNewerYtdlpVersion('2026.03.17.1', '2026.03.17'), true);
    assert.equal(isNewerYtdlpVersion('2026.03.17', '2026.03.17.1'), false);
  });

  test('missing input never counts as newer', () => {
    assert.equal(isNewerYtdlpVersion(null, '2026.03.17'), false);
    assert.equal(isNewerYtdlpVersion('2026.03.17', null), false);
    assert.equal(isNewerYtdlpVersion(undefined, undefined), false);
  });
});

describe('ffmpeg platform resolution', () => {
  test('resolves the local binary name per platform (.exe only on Windows)', () => {
    assert.equal(getFfmpegBinaryName('win32'), 'ffmpeg.exe');
    assert.equal(getFfmpegBinaryName('darwin'), 'ffmpeg');
    assert.equal(getFfmpegBinaryName('linux'), 'ffmpeg');
  });

  test('Windows downloads a zip from gyan.dev and matches ffmpeg.exe inside bin/', () => {
    const info = getFfmpegDownloadInfo('win32');
    assert.equal(info.archiveType, 'zip');
    assert.match(info.url, /gyan\.dev/);
    assert.equal(info.matchEntry('ffmpeg-7.0-essentials_build/bin/ffmpeg.exe'), true);
    assert.equal(info.matchEntry('ffmpeg-7.0-essentials_build/bin/ffplay.exe'), false);
    assert.equal(info.matchEntry('ffmpeg-7.0-essentials_build/doc/ffmpeg.exe.txt'), false);
  });

  test('macOS downloads a zip from evermeet.cx\'s stable release redirect and matches a bare ffmpeg entry', () => {
    const info = getFfmpegDownloadInfo('darwin');
    assert.equal(info.archiveType, 'zip');
    assert.equal(info.url, 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip');
    assert.equal(info.matchEntry('ffmpeg'), true);
    assert.equal(info.matchEntry('some/nested/path/ffmpeg'), true);
    assert.equal(info.matchEntry('ffprobe'), false);
  });

  test('Linux downloads a static tar.xz from johnvansickle.com with no zip entry matcher', () => {
    const info = getFfmpegDownloadInfo('linux');
    assert.equal(info.archiveType, 'tar.xz');
    assert.equal(info.url, 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz');
    assert.equal(info.matchEntry, null);
  });

  test('throws for a platform with no managed static build', () => {
    assert.throws(() => getFfmpegDownloadInfo('freebsd'), /no managed static build/);
  });
});
