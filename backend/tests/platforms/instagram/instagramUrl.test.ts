import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { isProfileUrl, parseInstagramUrl } from '../../../src/platforms/instagram/instagramUrl.ts';

describe('parseInstagramUrl', () => {
  test('empty input and other sites are not Instagram links', () => {
    for (const input of ['', null, undefined, 'https://twitter.com/someone']) assert.equal(parseInstagramUrl(input), null);
  });

  test('a post link keeps its shortcode', () => {
    assert.deepEqual(parseInstagramUrl('https://www.instagram.com/p/ABC123xyz/'), {
      urlType: 'post',
      shortcode: 'ABC123xyz',
      cleanUrl: 'https://www.instagram.com/p/ABC123xyz/',
    });
  });

  test('a /reels/ link becomes the canonical /reel/ form', () => {
    assert.equal(parseInstagramUrl('https://www.instagram.com/reels/ABC123xyz/')?.cleanUrl, 'https://www.instagram.com/reel/ABC123xyz/');
  });

  test('share parameters such as igsh and utm_source are dropped', () => {
    const parsed = parseInstagramUrl('https://www.instagram.com/reel/ABC123xyz/?igsh=xyz&utm_source=ig_web_copy_link');
    assert.equal(parsed?.cleanUrl, 'https://www.instagram.com/reel/ABC123xyz/');
  });

  test('a story link keeps its user and story id when it has one', () => {
    assert.deepEqual(parseInstagramUrl('https://www.instagram.com/stories/someuser/1234567890/'), {
      urlType: 'story',
      username: 'someuser',
      storyId: '1234567890',
      cleanUrl: 'https://www.instagram.com/stories/someuser/1234567890/',
    });
    const withoutId = parseInstagramUrl('https://www.instagram.com/stories/someuser/');
    assert.equal(withoutId && 'storyId' in withoutId ? withoutId.storyId : 'missing', null);
  });

  test('a profile, its reels tab and its tagged tab are all profiles', () => {
    const cases = [
      ['instagram.com/someuser', 'profile'],
      ['https://www.instagram.com/someuser/reels', 'profile-reels'],
      ['https://www.instagram.com/someuser/tagged', 'profile-tagged'],
    ] as const;
    for (const [url, urlType] of cases) {
      const parsed = parseInstagramUrl(url);
      assert.equal(parsed?.urlType, urlType);
      assert.equal(parsed ? isProfileUrl(parsed) : false, true);
    }
  });

  test("Instagram's own pages are never read as profiles", () => {
    for (const page of ['explore', 'direct', 'accounts']) assert.equal(parseInstagramUrl(`https://www.instagram.com/${page}`), null);
  });
});
