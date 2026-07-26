const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseInstagramUrl } = require('../utils/instagramUrlParser');

describe('parseInstagramUrl', () => {
  test('returns null for empty/non-string input', () => {
    assert.equal(parseInstagramUrl(''), null);
    assert.equal(parseInstagramUrl(null), null);
    assert.equal(parseInstagramUrl(undefined), null);
  });

  test('returns null for a non-Instagram URL', () => {
    assert.equal(parseInstagramUrl('https://twitter.com/someone'), null);
  });

  test('parses a post URL', () => {
    const result = parseInstagramUrl('https://www.instagram.com/p/ABC123xyz/');
    assert.equal(result.type, 'post');
    assert.equal(result.shortcode, 'ABC123xyz');
    assert.equal(result.cleanUrl, 'https://www.instagram.com/p/ABC123xyz/');
  });

  test('parses a reel URL (plural /reels/)', () => {
    const result = parseInstagramUrl('https://www.instagram.com/reels/ABC123xyz/');
    assert.equal(result.type, 'reel');
    assert.equal(result.shortcode, 'ABC123xyz');
    assert.equal(result.cleanUrl, 'https://www.instagram.com/reel/ABC123xyz/');
  });

  test('strips tracking params (igsh, utm_source, etc.)', () => {
    const result = parseInstagramUrl('https://www.instagram.com/reel/ABC123xyz/?igsh=xyz&utm_source=ig_web_copy_link');
    assert.equal(result.type, 'reel');
    assert.equal(result.cleanUrl, 'https://www.instagram.com/reel/ABC123xyz/');
  });

  test('parses a story URL with a story id', () => {
    const result = parseInstagramUrl('https://www.instagram.com/stories/someuser/1234567890/');
    assert.equal(result.type, 'story');
    assert.equal(result.username, 'someuser');
    assert.equal(result.storyId, '1234567890');
  });

  test('parses a story URL without a story id', () => {
    const result = parseInstagramUrl('https://www.instagram.com/stories/someuser/');
    assert.equal(result.type, 'story');
    assert.equal(result.storyId, null);
  });

  test('parses a profile reels tab', () => {
    const result = parseInstagramUrl('https://www.instagram.com/someuser/reels');
    assert.equal(result.type, 'profile_reels');
    assert.equal(result.username, 'someuser');
  });

  test('parses a profile tagged tab', () => {
    const result = parseInstagramUrl('https://www.instagram.com/someuser/tagged');
    assert.equal(result.type, 'profile_tagged');
    assert.equal(result.username, 'someuser');
  });

  test('parses a bare profile URL', () => {
    const result = parseInstagramUrl('instagram.com/someuser');
    assert.equal(result.type, 'profile');
    assert.equal(result.username, 'someuser');
  });

  test('rejects reserved paths as profiles', () => {
    assert.equal(parseInstagramUrl('https://www.instagram.com/explore'), null);
    assert.equal(parseInstagramUrl('https://www.instagram.com/direct'), null);
    assert.equal(parseInstagramUrl('https://www.instagram.com/accounts'), null);
  });
});
