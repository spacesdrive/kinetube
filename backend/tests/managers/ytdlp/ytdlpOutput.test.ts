import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseYtdlpLine, summarizeErrorOutput } from '../../../src/managers/ytdlp/ytdlpOutput.ts';

describe('parseYtdlpLine', () => {
  test('a progress line gives the percent, speed and time left', () => {
    assert.deepEqual(parseYtdlpLine('[download]  45.2% of 1.46GiB at 3.56MiB/s ETA 06:41'), {
      kind: 'progress',
      percent: 45.2,
      speed: '3.56MiB/s',
      eta: '06:41',
    });
  });

  test('the final 100 percent line without a time left still counts as progress', () => {
    assert.deepEqual(parseYtdlpLine('[download] 100% of 10.00MiB in 00:00:03 at 2.95MiB/s'), { kind: 'progress', percent: 100, speed: '', eta: '' });
  });

  test('destination, already downloaded, post-processing and other log lines are told apart', () => {
    assert.deepEqual(parseYtdlpLine('[download] Destination: /out/Title [id].f137.mp4'), { kind: 'destination', filePath: '/out/Title [id].f137.mp4' });
    assert.equal(parseYtdlpLine('[download] /out/x.mp4 has already been downloaded').kind, 'alreadyDownloaded');
    assert.deepEqual(parseYtdlpLine('[Merger] Merging formats into "C:/out/01 - video [abc].mp4"'), { kind: 'finalFile', filePath: 'C:/out/01 - video [abc].mp4' });
    assert.deepEqual(parseYtdlpLine('[ExtractAudio] Destination: /out/x.mp3'), { kind: 'finalFile', filePath: '/out/x.mp3' });
    assert.equal(parseYtdlpLine('[Merger] Deleting original file /out/x.f137.mp4').kind, 'postProcessing');
    assert.equal(parseYtdlpLine('[youtube] abc: Downloading webpage').kind, 'info');
    assert.equal(parseYtdlpLine('plain text').kind, 'other');
  });
});

describe('summarizeErrorOutput', () => {
  test('keeps the last two lines worth reading and drops [module] chatter', () => {
    const stderr = '[youtube] abc: Downloading webpage\nWARNING: slow\nERROR: Video unavailable\n';
    assert.equal(summarizeErrorOutput(stderr), 'WARNING: slow ERROR: Video unavailable');
  });
});
