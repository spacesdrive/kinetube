import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createMessageQueue } from '../../src/lib/messageQueue.ts';

const timeout = (): Error => new Error('timed out');

describe('createMessageQueue', () => {
  test('a message pushed before the read is returned by the next read', async () => {
    const queue = createMessageQueue<string>();
    queue.push('first');
    assert.equal(await queue.next(1_000, timeout), 'first');
  });

  test('a read waiting for a message gets the next one pushed', async () => {
    const queue = createMessageQueue<string>();
    const reading = queue.next(1_000, timeout);
    queue.push('later');
    assert.equal(await reading, 'later');
  });

  test('a read with nothing to read fails with the timeout error', async () => {
    await assert.rejects(createMessageQueue<string>().next(10, timeout), /timed out/);
  });

  test('ending the queue fails the waiting read and every read after it', async () => {
    const queue = createMessageQueue<string>();
    const reading = queue.next(1_000, timeout);
    queue.end(new Error('helper stopped'));
    await assert.rejects(reading, /helper stopped/);
    await assert.rejects(queue.next(1_000, timeout), /helper stopped/);
  });

  test('messages queued before the end are still read first', async () => {
    const queue = createMessageQueue<string>();
    queue.push('last words');
    queue.end(new Error('helper stopped'));
    assert.equal(await queue.next(1_000, timeout), 'last words');
  });
});
