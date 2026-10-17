import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { clockTime, renderTranscripts, TRANSCRIPT_FORMATS } from '../../../src/managers/whisper/whisperFormats.ts';
import { parseSegment, parseSegments } from '../../../src/managers/whisper/whisperTranscript.ts';

const RAW = '[00:00:00.000 --> 00:00:02.500]   Hello there.\n\n[00:00:02.500 --> 00:00:05.040]  She said "hi",\tthen left.\r\n';
const SEGMENTS = parseSegments(RAW);
const FILES = renderTranscripts(SEGMENTS, 'Hello there. She said "hi", then left.');

describe('parseSegments', () => {
  test('each timestamped line becomes a segment in milliseconds', () => {
    assert.deepEqual(SEGMENTS, [
      { startMs: 0, endMs: 2500, text: 'Hello there.' },
      { startMs: 2500, endMs: 5040, text: 'She said "hi",\tthen left.' },
    ]);
  });

  test('hours count, and lines without a timestamp or words are skipped', () => {
    assert.deepEqual(parseSegment('[01:02:03.004 --> 01:02:05.000] Late.'), { startMs: 3_723_004, endMs: 3_725_000, text: 'Late.' });
    assert.equal(parseSegment('whisper_init_from_file: loading model'), null);
    assert.equal(parseSegment('[00:00:00.000 --> 00:00:01.000]   '), null);
  });
});

describe('renderTranscripts', () => {
  test('every format is rendered', () => {
    assert.deepEqual(Object.keys(FILES).sort(), [...TRANSCRIPT_FORMATS].sort());
  });

  test('txt is the paragraph on one line', () => {
    assert.equal(FILES.txt, 'Hello there. She said "hi", then left.\n');
  });

  test('srt numbers each cue and uses a comma before the milliseconds', () => {
    assert.equal(FILES.srt, '1\n00:00:00,000 --> 00:00:02,500\nHello there.\n\n2\n00:00:02,500 --> 00:00:05,040\nShe said "hi",\tthen left.\n');
  });

  test('vtt starts with its header and uses a full stop before the milliseconds', () => {
    assert.equal(FILES.vtt, 'WEBVTT\n\n00:00:00.000 --> 00:00:02.500\nHello there.\n\n00:00:02.500 --> 00:00:05.040\nShe said "hi",\tthen left.\n');
  });

  test('lrc tags each line with minutes, seconds and hundredths', () => {
    assert.equal(FILES.lrc, '[00:00.00]Hello there.\n[00:02.50]She said "hi",\tthen left.\n');
    assert.equal(renderTranscripts([{ startMs: 3_723_004, endMs: 3_725_000, text: 'Late.' }], 'Late.').lrc, '[62:03.00]Late.\n');
  });

  test('csv quotes the text and doubles its quotes; tsv replaces tabs', () => {
    assert.equal(FILES.csv, 'start,end,text\n0,2500,"Hello there."\n2500,5040,"She said ""hi"",\tthen left."\n');
    assert.equal(FILES.tsv, 'start\tend\ttext\n0\t2500\tHello there.\n2500\t5040\tShe said "hi", then left.\n');
  });

  test('json carries the paragraph and the segments in seconds', () => {
    assert.deepEqual(JSON.parse(FILES.json), {
      text: 'Hello there. She said "hi", then left.',
      segments: [
        { start: 0, end: 2.5, text: 'Hello there.' },
        { start: 2.5, end: 5.04, text: 'She said "hi",\tthen left.' },
      ],
    });
  });

  test('a recording with no speech still gives valid files', () => {
    const empty = renderTranscripts([], '');
    assert.equal(empty.srt, '');
    assert.equal(empty.vtt, 'WEBVTT\n');
    assert.equal(empty.csv, 'start,end,text\n');
    assert.deepEqual(JSON.parse(empty.json), { text: '', segments: [] });
  });
});

describe('clockTime', () => {
  test('pads every part', () => {
    assert.equal(clockTime(3_723_004, ','), '01:02:03,004');
    assert.equal(clockTime(59, '.'), '00:00:00.059');
  });
});
