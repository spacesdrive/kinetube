const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseYouTubeUrl } = require('../utils/urlParser');

describe('parseYouTubeUrl', () => {
  test('returns null for empty/non-string input', () => {
    assert.equal(parseYouTubeUrl(''), null);
    assert.equal(parseYouTubeUrl(null), null);
    assert.equal(parseYouTubeUrl(undefined), null);
    assert.equal(parseYouTubeUrl(42), null);
  });

  test('returns null for a non-YouTube URL', () => {
    assert.equal(parseYouTubeUrl('https://vimeo.com/12345'), null);
    assert.equal(parseYouTubeUrl('not a url at all'), null);
  });

  test('parses a standard watch URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(result.type, 'video');
    assert.equal(result.id, 'dQw4w9WgXcQ');
    assert.equal(result.cleanUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('strips extra query params from a watch URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLxyz');
    assert.equal(result.type, 'video');
    assert.equal(result.id, 'dQw4w9WgXcQ');
  });

  test('normalizes www./m. host prefixes', () => {
    const result = parseYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(result.type, 'video');
  });

  test('adds a missing protocol', () => {
    const result = parseYouTubeUrl('youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(result.type, 'video');
    assert.equal(result.id, 'dQw4w9WgXcQ');
  });

  test('parses a youtu.be short link', () => {
    const result = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=abc123');
    assert.equal(result.type, 'video');
    assert.equal(result.id, 'dQw4w9WgXcQ');
    assert.equal(result.cleanUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('rejects a youtu.be link with an invalid id', () => {
    assert.equal(parseYouTubeUrl('https://youtu.be/short'), null);
  });

  test('parses a Shorts URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    assert.equal(result.type, 'shorts');
    assert.equal(result.id, 'dQw4w9WgXcQ');
  });

  test('parses a channel /videos tab by handle', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/@somechannel/videos');
    assert.equal(result.type, 'channel_videos');
    assert.equal(result.channelPath, '@somechannel');
  });

  test('parses a channel /shorts tab by channel id', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/channel/UCabcdefghijklmnopqrstu/shorts');
    assert.equal(result.type, 'channel_shorts');
    assert.equal(result.channelPath, 'channel/UCabcdefghijklmnopqrstu');
  });

  test('parses a bare channel handle URL and redirects to /videos', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/@somechannel');
    assert.equal(result.type, 'channel');
    assert.equal(result.cleanUrl, 'https://www.youtube.com/@somechannel/videos');
  });

  test('strips trailing hash fragments', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=10');
    assert.equal(result.type, 'video');
  });

  test('returns null for an unrecognized path shape', () => {
    assert.equal(parseYouTubeUrl('https://www.youtube.com/results?search_query=cats'), null);
  });
});
