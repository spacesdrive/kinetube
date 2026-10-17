import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseYouTubeUrl } from '../../../src/platforms/youtube/youtubeUrl.ts';

const LIST_ID = 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';

describe('parseYouTubeUrl', () => {
  test('empty or non-text input is not a YouTube link', () => {
    for (const input of ['', null, undefined, 42]) assert.equal(parseYouTubeUrl(input), null);
  });

  test('links to other sites and plain words are rejected', () => {
    assert.equal(parseYouTubeUrl('https://vimeo.com/12345'), null);
    assert.equal(parseYouTubeUrl('not a url at all'), null);
  });

  test('a watch link keeps only the video id', () => {
    const parsed = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&si=abc');
    assert.deepEqual(parsed, { urlType: 'video', videoId: 'dQw4w9WgXcQ', cleanUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', playlistUrl: null });
  });

  test('a watch link inside a playlist stays a video and names the playlist', () => {
    const parsed = parseYouTubeUrl(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${LIST_ID}&index=3`);
    assert.deepEqual(parsed, {
      urlType: 'video',
      videoId: 'dQw4w9WgXcQ',
      cleanUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      playlistUrl: `https://www.youtube.com/playlist?list=${LIST_ID}`,
    });
  });

  test('a youtu.be link with a list names the playlist too', () => {
    const parsed = parseYouTubeUrl(`https://youtu.be/dQw4w9WgXcQ?list=${LIST_ID}`);
    assert.equal(parsed && 'playlistUrl' in parsed ? parsed.playlistUrl : null, `https://www.youtube.com/playlist?list=${LIST_ID}`);
  });

  test('a watch link with a malformed list is still a video, without a playlist', () => {
    for (const listId of ['PLxyz', 'PL<script>alert(1)</script>', 'x'.repeat(65)]) {
      const parsed = parseYouTubeUrl(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=${encodeURIComponent(listId)}`);
      assert.equal(parsed?.urlType, 'video', listId);
      assert.equal(parsed && 'playlistUrl' in parsed ? parsed.playlistUrl : 'missing', null, listId);
    }
  });

  test('a playlist link keeps only its list id', () => {
    const parsed = parseYouTubeUrl(`https://m.youtube.com/playlist?list=${LIST_ID}&si=tracking`);
    assert.deepEqual(parsed, { urlType: 'playlist', listId: LIST_ID, cleanUrl: `https://www.youtube.com/playlist?list=${LIST_ID}` });
  });

  test('a playlist link without a valid list id is rejected', () => {
    for (const query of ['', '?list=', '?list=PLxyz', '?list=PL%2F..%2F..', `?list=${'x'.repeat(65)}`]) {
      assert.equal(parseYouTubeUrl(`https://www.youtube.com/playlist${query}`), null, query);
    }
  });

  test('mobile hosts, a missing protocol and a fragment are all accepted', () => {
    assert.equal(parseYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')?.urlType, 'video');
    assert.equal(parseYouTubeUrl('youtube.com/watch?v=dQw4w9WgXcQ')?.urlType, 'video');
    assert.equal(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=10')?.urlType, 'video');
  });

  test('a youtu.be share link becomes a watch link', () => {
    const parsed = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=abc123');
    assert.equal(parsed?.cleanUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('a youtu.be link with a malformed id is rejected', () => {
    assert.equal(parseYouTubeUrl('https://youtu.be/short'), null);
  });

  test('a Shorts link keeps its shorts address', () => {
    const parsed = parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    assert.deepEqual(parsed, { urlType: 'shorts', videoId: 'dQw4w9WgXcQ', cleanUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', playlistUrl: null });
  });

  test('a channel videos tab and a shorts tab keep their tab', () => {
    assert.equal(parseYouTubeUrl('https://www.youtube.com/@somechannel/videos')?.urlType, 'channel-videos');
    const shorts = parseYouTubeUrl('https://www.youtube.com/channel/UCabcdefghijklmnopqrstu/shorts');
    assert.equal(shorts?.urlType, 'channel-shorts');
    assert.equal(shorts && 'channelPath' in shorts ? shorts.channelPath : null, 'channel/UCabcdefghijklmnopqrstu');
  });

  test('a bare channel link opens its videos tab', () => {
    const parsed = parseYouTubeUrl('https://www.youtube.com/@somechannel');
    assert.deepEqual(parsed, { urlType: 'channel', channelPath: '@somechannel', tab: 'videos', cleanUrl: 'https://www.youtube.com/@somechannel/videos' });
  });

  test('each channel tab gets its own type and a clean link to that tab', () => {
    const tabs = [
      ['videos', 'channel-videos'],
      ['shorts', 'channel-shorts'],
      ['streams', 'channel-streams'],
      ['playlists', 'channel-playlists'],
    ] as const;
    for (const [tab, urlType] of tabs) {
      const parsed = parseYouTubeUrl(`https://www.youtube.com/@somechannel/${tab}/?si=abc`);
      assert.deepEqual(parsed, { urlType, channelPath: '@somechannel', tab, cleanUrl: `https://www.youtube.com/@somechannel/${tab}` });
    }
  });

  test('other channel pages such as the community tab or the current live video are rejected', () => {
    for (const tab of ['community', 'live', 'featured', 'about']) {
      assert.equal(parseYouTubeUrl(`https://www.youtube.com/@somechannel/${tab}`), null, tab);
    }
  });

  test('a search results page is not a video or a channel', () => {
    assert.equal(parseYouTubeUrl('https://www.youtube.com/results?search_query=cats'), null);
  });
});
