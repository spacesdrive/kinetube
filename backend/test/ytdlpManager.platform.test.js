const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  getYtdlpAssetName,
  getYtdlpBinaryName,
  getYtdlpDownloadUrl,
  getFfmpegBinaryName,
  getFfmpegDownloadInfo,
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
