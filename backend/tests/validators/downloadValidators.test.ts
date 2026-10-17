import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ValidationError } from '../../src/lib/errors.ts';
import { mapYouTubeChannel, mapYouTubePlaylist } from '../../src/platforms/youtube/youtubeMetadata.ts';
import { parseCreateBatch, parseCreateDownload } from '../../src/validators/downloadValidators.ts';
import { PLAYLIST_SAMPLE } from '../fixtures/youtubeSamples.ts';

const LIST_LINK = 'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';

function isWholeListError(error: unknown): boolean {
  return error instanceof ValidationError && /channel or playlist link can't be downloaded in one go/.test(error.message);
}

describe('parseCreateDownload', () => {
  test('a playlist link and a channel tab are refused with a message that says to pick videos', () => {
    for (const url of [LIST_LINK, 'https://www.youtube.com/@NASA/streams', 'https://www.youtube.com/@jawed/playlists']) {
      assert.throws(() => parseCreateDownload({ url }), isWholeListError, url);
    }
  });

  test('a watch link inside a playlist downloads only that video', () => {
    const { target } = parseCreateDownload({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI' });
    assert.equal(target.cleanUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('a link from another site keeps the general message', () => {
    assert.throws(() => parseCreateDownload({ url: 'https://vimeo.com/1' }), /Use a single YouTube video or Shorts link/);
  });
});

describe('parseCreateBatch', () => {
  test('every entry of a playlist and of a Shorts tab is accepted as a batch item', () => {
    const playlist = mapYouTubePlaylist(PLAYLIST_SAMPLE, { urlType: 'playlist', listId: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI', cleanUrl: LIST_LINK });
    const shorts = mapYouTubeChannel(
      { entries: [{ id: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' }] },
      { urlType: 'channel-shorts', channelPath: '@x', tab: 'shorts', cleanUrl: 'https://www.youtube.com/@x/shorts' },
    );
    const entries = [...playlist.entries, ...shorts.entries];

    const batch = parseCreateBatch({ items: entries.map((entry) => ({ url: entry.url, title: entry.title })) });
    assert.deepEqual(
      batch.items.map((item) => item.target.cleanUrl),
      entries.map((entry) => entry.url),
    );
  });

  test('a playlist link inside a batch is refused', () => {
    assert.throws(() => parseCreateBatch({ items: [{ url: 'https://youtu.be/dQw4w9WgXcQ' }, { url: LIST_LINK }] }), isWholeListError);
  });
});
