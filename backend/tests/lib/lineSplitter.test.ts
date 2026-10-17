import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createLineSplitter, isRecord, parseJsonLine } from '../../src/lib/lineSplitter.ts';

describe('createLineSplitter', () => {
  test('a line split across two chunks is delivered once, whole', () => {
    const lines: string[] = [];
    const write = createLineSplitter((line) => lines.push(line));

    write('first\nsec');
    write('ond\n');

    assert.deepEqual(lines, ['first', 'second']);
  });

  test('blank lines and Windows line endings are dropped', () => {
    const lines: string[] = [];
    const write = createLineSplitter((line) => lines.push(line));

    write('one\r\n\r\n  two  \r\n');

    assert.deepEqual(lines, ['one', 'two']);
  });

  test('a trailing line without a newline waits for the next chunk', () => {
    const lines: string[] = [];
    createLineSplitter((line) => lines.push(line))('pending');
    assert.deepEqual(lines, []);
  });
});

describe('parseJsonLine and isRecord', () => {
  test('a JSON object line is read as a record', () => {
    const parsed = parseJsonLine('{"status":"success"}');
    assert.equal(isRecord(parsed), true);
  });

  test('text that is not JSON reads as null instead of throwing', () => {
    assert.equal(parseJsonLine('Traceback (most recent call last):'), null);
  });

  test('arrays and null are not records', () => {
    assert.equal(isRecord([]), false);
    assert.equal(isRecord(null), false);
  });
});
