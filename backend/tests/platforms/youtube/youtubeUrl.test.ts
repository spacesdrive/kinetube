import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseYouTubeUrl } from '../../../src/platforms/youtube/youtubeUrl.ts';

describe('parseYouTubeUrl', () => {
  test('empty or non-text input is not a YouTube link', () => {
    for (const input of ['', null, undefined, 42]) assert.equal(parseYouTubeUrl(input), null);
  });

  test('links to other sites and plain words are rejected', () => {
    assert.equal(parseYouTubeUrl('https://vimeo.com/12345'), null);
    assert.equal(parseYouTubeUrl('not a url at all'), null);
  });

  test('a watch link keeps only the video id', () => {
    const parsed = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLxyz');
    assert.deepEqual(parsed, { urlType: 'video', videoId: 'dQw4w9WgXcQ', cleanUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
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
    assert.deepEqual(parsed, { urlType: 'shorts', videoId: 'dQw4w9WgXcQ', cleanUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' });
  });

  test('a channel videos tab and a shorts tab keep their tab', () => {
    assert.equal(parseYouTubeUrl('https://www.youtube.com/@somechannel/videos')?.urlType, 'channel-videos');
    const shorts = parseYouTubeUrl('https://www.youtube.com/channel/UCabcdefghijklmnopqrstu/shorts');
    assert.equal(shorts?.urlType, 'channel-shorts');
    assert.equal(shorts && 'channelPath' in shorts ? shorts.channelPath : null, 'channel/UCabcdefghijklmnopqrstu');
  });

  test('a bare channel link opens its videos tab', () => {
    const parsed = parseYouTubeUrl('https://www.youtube.com/@somechannel');
    assert.equal(parsed?.urlType, 'channel');
    assert.equal(parsed?.cleanUrl, 'https://www.youtube.com/@somechannel/videos');
  });

  test('a search results page is not a video or a channel', () => {
    assert.equal(parseYouTubeUrl('https://www.youtube.com/results?search_query=cats'), null);
  });
});
