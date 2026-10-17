import { describe, expect, it } from 'vitest';

import { cleanInstagramUrl, cleanYouTubeUrl, isInstagramLink } from '@/lib/urlCleaners';

describe('cleanYouTubeUrl', () => {
  it('drops share parameters from a youtu.be link', () => {
    expect(cleanYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=xyz&pp=abc')).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('keeps only the v parameter of a watch link', () => {
    expect(cleanYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz&list=PL123')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('cleans a Shorts link and a channel link', () => {
    expect(cleanYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ?si=xyz')).toBe('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    expect(cleanYouTubeUrl('https://www.youtube.com/@somechannel/videos?si=xyz')).toBe('https://www.youtube.com/@somechannel/videos');
  });

  it('adds a missing https', () => {
    expect(cleanYouTubeUrl('youtu.be/dQw4w9WgXcQ')).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('leaves another site, empty text and text that is not a link as typed, minus spaces', () => {
    expect(cleanYouTubeUrl('https://vimeo.com/12345')).toBe('https://vimeo.com/12345');
    expect(cleanYouTubeUrl('')).toBe('');
    expect(cleanYouTubeUrl('   not a url   ')).toBe('not a url');
  });
});

describe('cleanInstagramUrl', () => {
  it('drops tracking parameters from reels and posts', () => {
    expect(cleanInstagramUrl('https://www.instagram.com/reel/ABC123xyz/?igsh=xyz&utm_source=ig_web_copy_link')).toBe('https://www.instagram.com/reel/ABC123xyz/');
    expect(cleanInstagramUrl('https://www.instagram.com/p/ABC123xyz/?igsh=xyz')).toBe('https://www.instagram.com/p/ABC123xyz/');
  });

  it('keeps the whole path of a story and of a profile', () => {
    expect(cleanInstagramUrl('https://www.instagram.com/stories/someuser/1234567890?utm_source=qr')).toBe('https://www.instagram.com/stories/someuser/1234567890/');
    expect(cleanInstagramUrl('instagram.com/someuser?hl=en')).toBe('https://www.instagram.com/someuser/');
  });

  it('leaves another site as it is', () => {
    expect(cleanInstagramUrl('https://twitter.com/someone')).toBe('https://twitter.com/someone');
  });
});

describe('isInstagramLink', () => {
  it('recognises an Instagram link wherever it is pasted from', () => {
    expect(isInstagramLink('HTTPS://WWW.INSTAGRAM.COM/p/x')).toBe(true);
    expect(isInstagramLink('https://youtu.be/x')).toBe(false);
  });
});
