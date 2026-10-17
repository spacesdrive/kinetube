import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { entryStatus, mapPlaylistEntries, mapVideoEntries } from '../../../src/platforms/youtube/youtubeEntries.ts';
import { CHANNEL_PLAYLISTS_SAMPLE } from '../../fixtures/youtubeSamples.ts';

describe('entryStatus', () => {
  test('a stream that has not started is upcoming and one still running is live', () => {
    assert.equal(entryStatus({ live_status: 'is_upcoming' }), 'upcoming');
    assert.equal(entryStatus({ live_status: 'is_live' }), 'live');
  });

  test('a finished stream, an unlisted video and a plain video can be downloaded', () => {
    assert.equal(entryStatus({ live_status: 'was_live' }), 'available');
    assert.equal(entryStatus({ availability: 'unlisted' }), 'available');
    assert.equal(entryStatus({ live_status: null, availability: null, title: 'Clip' }), 'available');
  });

  test('a private, members-only or deleted video is unavailable', () => {
    for (const availability of ['private', 'needs_auth', 'premium_only', 'subscriber_only']) {
      assert.equal(entryStatus({ availability }), 'unavailable', availability);
    }
    for (const title of ['[Private video]', '[Deleted video]', '[Unavailable video]']) {
      assert.equal(entryStatus({ title }), 'unavailable', title);
    }
  });

  test('a title that only mentions a private video is still available', () => {
    assert.equal(entryStatus({ title: 'Why my [Private video] went public' }), 'available');
  });
});

describe('mapVideoEntries', () => {
  test('a Shorts entry keeps its shorts link and any other link becomes a clean watch link', () => {
    const entries = mapVideoEntries([
      { id: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' },
      { id: 'abcdefghijk', url: 'https://www.youtube.com/watch?v=abcdefghijk&pp=tracking' },
      { id: 'zyxwvutsrqp', url: 'https://www.youtube.com/watch?v=someoneelse' },
      { id: 'mnopqrstuvw' },
    ]);
    assert.deepEqual(
      entries.map((entry) => entry.url),
      [
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=abcdefghijk',
        'https://www.youtube.com/watch?v=zyxwvutsrqp',
        'https://www.youtube.com/watch?v=mnopqrstuvw',
      ],
    );
  });

  test('a playlist listed among the entries is not mistaken for a video', () => {
    assert.deepEqual(mapVideoEntries(CHANNEL_PLAYLISTS_SAMPLE.entries), []);
  });
});

describe('mapPlaylistEntries', () => {
  test('a playlist gets a clean playlist link from its id', () => {
    const playlists = mapPlaylistEntries([{ ie_key: 'YoutubeTab', id: 'PLuhl9TnQPDCnWIhy_KSbtFwXVQnNvgfSh', url: 'https://example.com/elsewhere' }]);
    assert.deepEqual(playlists, [
      {
        id: 'PLuhl9TnQPDCnWIhy_KSbtFwXVQnNvgfSh',
        title: 'Untitled playlist',
        url: 'https://www.youtube.com/playlist?list=PLuhl9TnQPDCnWIhy_KSbtFwXVQnNvgfSh',
        thumbnailUrl: null,
      },
    ]);
  });

  test('videos, missing entries and malformed list ids are dropped', () => {
    const playlists = mapPlaylistEntries([
      null,
      { ie_key: 'Youtube', id: 'dQw4w9WgXcQ' },
      { ie_key: 'YoutubeTab', id: 'bad id' },
      { ie_key: 'YoutubeTab', title: 'no id' },
    ]);
    assert.deepEqual(playlists, []);
  });
});
