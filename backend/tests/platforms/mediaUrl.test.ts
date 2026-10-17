import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { isInstagramUsername } from '../../src/platforms/instagram/instagramUsername.ts';
import { parseDownloadTarget } from '../../src/platforms/mediaUrl.ts';

describe('parseDownloadTarget', () => {
  test('a YouTube video and an Instagram reel can be downloaded', () => {
    assert.deepEqual(parseDownloadTarget('https://youtu.be/dQw4w9WgXcQ'), {
      platform: 'youtube',
      cleanUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    assert.equal(parseDownloadTarget('https://www.instagram.com/reel/ABC123xyz/')?.platform, 'instagram');
  });

  test('a channel, a playlist or a profile is refused, so one request never downloads a whole page', () => {
    assert.equal(parseDownloadTarget('https://www.youtube.com/@somechannel'), null);
    assert.equal(parseDownloadTarget('https://www.youtube.com/@somechannel/streams'), null);
    assert.equal(parseDownloadTarget('https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI'), null);
    assert.equal(parseDownloadTarget('https://www.instagram.com/someuser/'), null);
  });

  test('a Shorts link and a watch link inside a playlist can be downloaded as one video', () => {
    assert.equal(parseDownloadTarget('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.cleanUrl, 'https://www.youtube.com/shorts/dQw4w9WgXcQ');
    const fromPlaylist = parseDownloadTarget('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');
    assert.equal(fromPlaylist?.cleanUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('a value that looks like a yt-dlp option is refused', () => {
    assert.equal(parseDownloadTarget('--exec=calc'), null);
  });
});

describe('isInstagramUsername', () => {
  test('letters, digits, periods and underscores are a username', () => {
    assert.equal(isInstagramUsername('some.user_1'), true);
  });

  test('anything that could reach outside the sessions folder is refused', () => {
    for (const value of ['../../etc', '..', 'a/b', 'a\\b', '', 'x'.repeat(31), 42]) {
      assert.equal(isInstagramUsername(value), false, String(value));
    }
  });
});
