import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { isNewerVersion } from '../../src/lib/versions.ts';

describe('isNewerVersion', () => {
  test('a greater calendar version is newer and a smaller one is not', () => {
    assert.equal(isNewerVersion('2026.08.19', '2026.03.17'), true);
    assert.equal(isNewerVersion('2026.03.17', '2026.08.19'), false);
  });

  test('parts compare as numbers, so 10 is newer than 9', () => {
    assert.equal(isNewerVersion('2026.3.10', '2026.3.9'), true);
    assert.equal(isNewerVersion('2026.3.9', '2026.3.10'), false);
  });

  test('the same version is not newer than itself', () => {
    assert.equal(isNewerVersion('2026.03.17', '2026.03.17'), false);
  });

  test('a patch suffix is newer than its base release', () => {
    assert.equal(isNewerVersion('2026.03.17.1', '2026.03.17'), true);
    assert.equal(isNewerVersion('2026.03.17', '2026.03.17.1'), false);
  });

  test('a missing version is never newer', () => {
    assert.equal(isNewerVersion(null, '2026.03.17'), false);
    assert.equal(isNewerVersion('2026.03.17', null), false);
    assert.equal(isNewerVersion(undefined, undefined), false);
  });
});
