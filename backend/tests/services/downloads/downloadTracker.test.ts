import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseYtdlpLine } from '../../../src/managers/ytdlp/ytdlpOutput.ts';
import { createDownloadTracker } from '../../../src/services/downloads/downloadTracker.ts';

import type { StreamEvent } from '../../../src/lib/sse.ts';
import type { TrackerEvents } from '../../../src/services/downloads/downloadTracker.ts';

function track(isAudioOnly: boolean, lines: string[]) {
  const events: StreamEvent<TrackerEvents>[] = [];
  const titles: string[] = [];
  const tracker = createDownloadTracker(isAudioOnly, (...event) => events.push(event), (title) => titles.push(title));
  for (const line of lines) tracker.handleLine(parseYtdlpLine(line));
  return { tracker, events, titles };
}

describe('createDownloadTracker', () => {
  test('a video and audio download moves from video to audio to merging and ends as one mp4', () => {
    const { tracker, events, titles } = track(false, [
      '[download] Destination: /out/My_Clip [abc123XYZ].f137.mp4',
      '[download]  50.0% of 10MiB at 1MiB/s ETA 00:05',
      '[download] Destination: /out/My_Clip [abc123XYZ].f140.m4a',
      '[Merger] Merging formats into "/out/My_Clip [abc123XYZ].mp4"',
    ]);

    assert.deepEqual(titles, ['My Clip']);
    const phases = events.filter(([event]) => event === 'phase').map(([, data]) => ('phase' in data ? data.phase : null));
    assert.deepEqual(phases, ['audio', 'merging']);
    assert.equal(tracker.filePath(), '/out/My_Clip [abc123XYZ].mp4');
  });

  test('progress events carry the title and the current phase', () => {
    const { events } = track(false, ['[download] Destination: /out/T [abc123XYZ].mp4', '[download]  10.0% of 10MiB at 1MiB/s ETA 00:09']);
    const progress = events.find(([event]) => event === 'progress');
    assert.deepEqual(progress?.[1], { percent: 10, speed: '1MiB/s', eta: '00:09', title: 'T', phase: 'video', isMultiFile: false });
  });

  test('an audio-only download starts in the audio phase and is labelled as an MP3 conversion', () => {
    const { tracker, events } = track(true, ['[download] Destination: /out/Song [abc123XYZ].webm', '[ExtractAudio] Destination: /out/Song.mp3']);
    const merging = events.find(([event, data]) => event === 'phase' && 'label' in data);
    assert.equal(merging?.[1] && 'label' in merging[1] ? merging[1].label : null, 'Converting to MP3...');
    assert.equal(tracker.filePath(), '/out/Song [abc123XYZ].mp3');
  });

  test('a file that was already downloaded still reports its title and path', () => {
    const { tracker, titles } = track(false, ['[download] /out/Done_Clip [abc123XYZ].mp4 has already been downloaded']);
    assert.deepEqual(titles, ['Done Clip']);
    assert.equal(tracker.filePath(), '/out/Done_Clip [abc123XYZ].mp4');
  });

  test('with no destination line there is no file path to report', () => {
    assert.equal(track(false, ['[youtube] abc: Downloading webpage']).tracker.filePath(), '');
  });
});
