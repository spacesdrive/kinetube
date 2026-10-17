import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ffmpegBinaryName, ffmpegDownloadInfo } from '../../../src/managers/ffmpeg/ffmpegBinary.ts';

describe('FFmpeg per platform', () => {
  test('only Windows gives the binary an .exe name', () => {
    assert.equal(ffmpegBinaryName('win32'), 'ffmpeg.exe');
    assert.equal(ffmpegBinaryName('linux'), 'ffmpeg');
  });

  test('Windows takes ffmpeg.exe from the bin folder of the gyan.dev zip', () => {
    const info = ffmpegDownloadInfo('win32');
    assert.equal(info.archiveType, 'zip');
    assert.match(info.url, /gyan\.dev/);
    assert.equal(info.matchEntry?.('ffmpeg-7.0-essentials_build/bin/ffmpeg.exe'), true);
    assert.equal(info.matchEntry?.('ffmpeg-7.0-essentials_build/bin/ffplay.exe'), false);
    assert.equal(info.matchEntry?.('ffmpeg-7.0-essentials_build/doc/ffmpeg.exe.txt'), false);
  });

  test("macOS takes the bare ffmpeg entry from evermeet.cx's release zip", () => {
    const info = ffmpegDownloadInfo('darwin');
    assert.equal(info.url, 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip');
    assert.equal(info.matchEntry?.('some/nested/path/ffmpeg'), true);
    assert.equal(info.matchEntry?.('ffprobe'), false);
  });

  test('Linux unpacks the static tar.xz, so there is no zip matcher', () => {
    const info = ffmpegDownloadInfo('linux');
    assert.equal(info.archiveType, 'tar.xz');
    assert.equal(info.url, 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz');
    assert.equal(info.matchEntry, null);
  });

  test('a platform without a static build is refused by name', () => {
    assert.throws(() => ffmpegDownloadInfo('freebsd'), /no managed static build for platform "freebsd"/);
  });
});
