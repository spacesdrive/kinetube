import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { createPendingDownloadStore } from '../../src/stores/pendingDownloadStore.ts';
import { makeTempDir, removeDir } from '../fixtures/tempDir.ts';

import type { DownloadRecord } from '../../src/stores/downloadRecord.ts';

function sampleRecord(id: string): DownloadRecord {
  return {
    id,
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: '',
    options: { quality: 'best', isAudioOnly: false, outputDir: null, fileName: { prefix: '', suffix: '', template: '', sequenceNumber: null }, account: null },
    startedAt: '2026-10-17T10:00:00.000Z',
    pausedAt: null,
  };
}

describe('pendingDownloadStore', () => {
  let dir = '';
  let filePath = '';

  beforeEach(() => {
    dir = makeTempDir();
    filePath = path.join(dir, 'pending-downloads.json');
  });
  afterEach(() => removeDir(dir));

  test('a saved record can be listed and found again', () => {
    const store = createPendingDownloadStore(filePath);
    store.save(sampleRecord('a'));

    assert.equal(store.list().length, 1);
    assert.equal(store.find('a')?.url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('saving the same id twice replaces the record instead of adding a second one', () => {
    const store = createPendingDownloadStore(filePath);
    store.save(sampleRecord('a'));
    store.save({ ...sampleRecord('a'), title: 'My Video' });

    assert.equal(store.list().length, 1);
    assert.equal(store.find('a')?.title, 'My Video');
  });

  test('removing a record leaves the others and reports whether it existed', () => {
    const store = createPendingDownloadStore(filePath);
    store.save(sampleRecord('a'));
    store.save(sampleRecord('b'));

    assert.equal(store.remove('a'), true);
    assert.equal(store.remove('a'), false);
    assert.deepEqual(store.list().map((record) => record.id), ['b']);
  });

  test('a missing or corrupt file reads as no records', () => {
    assert.deepEqual(createPendingDownloadStore(filePath).list(), []);
    fs.writeFileSync(filePath, '{not valid json');
    assert.deepEqual(createPendingDownloadStore(filePath).list(), []);
  });

  test('a record written by version 1.x is read with its options moved into place', () => {
    const legacy = {
      id: 'old', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', quality: '1080p', audioOnly: true, outputDir: 'D:\\Videos',
      prefix: 'p', suffix: 's', mainName: '%(title)s', useNumbering: true, sequenceNum: 4, title: 'Old', startedAt: '2026-01-01T00:00:00.000Z',
    };
    fs.writeFileSync(filePath, JSON.stringify([legacy]));

    const record = createPendingDownloadStore(filePath).find('old');
    assert.equal(record?.options.quality, '1080p');
    assert.equal(record?.options.isAudioOnly, true);
    assert.deepEqual(record?.options.fileName, { prefix: 'p', suffix: 's', template: '%(title)s', sequenceNumber: 4 });
  });
});
