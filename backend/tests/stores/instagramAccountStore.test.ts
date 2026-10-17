import assert from 'node:assert/strict';
import fs from 'node:fs';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { createInstagramAccountStore } from '../../src/stores/instagramAccountStore.ts';
import { makeTempPaths, removeDir } from '../fixtures/tempDir.ts';

import type { InstagramAccountStore } from '../../src/stores/instagramAccountStore.ts';

describe('instagramAccountStore', () => {
  let root = '';
  let accountsFile = '';
  let store: InstagramAccountStore;

  beforeEach(() => {
    const paths = makeTempPaths();
    root = paths.root;
    accountsFile = paths.accountsFile;
    store = createInstagramAccountStore(paths);
  });
  afterEach(() => removeDir(root));

  test('an added account is listed, and knows when its session file exists', () => {
    store.add('someone');
    assert.equal(store.find('someone')?.hasSession, false);

    fs.writeFileSync(store.sessionPath('someone'), 'cookies');
    assert.equal(store.find('someone')?.hasSession, true);
  });

  test('adding the same account twice keeps one entry', () => {
    store.add('someone');
    store.add('someone');
    assert.equal(store.list().length, 1);
  });

  test('removing an account deletes its session file too', () => {
    store.add('someone');
    fs.writeFileSync(store.sessionPath('someone'), 'cookies');

    assert.equal(store.remove('someone'), true);
    assert.equal(fs.existsSync(store.sessionPath('someone')), false);
    assert.equal(store.remove('someone'), false);
  });

  test('an entry whose name is not a valid username is ignored when the file is read', () => {
    fs.writeFileSync(accountsFile, JSON.stringify([{ username: '../../x', addedAt: '' }, { username: 'fine', addedAt: '' }]));
    assert.deepEqual(store.list().map((account) => account.username), ['fine']);
  });
});
