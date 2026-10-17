import { describe, expect, it } from 'vitest';

import { cleanInstagramUrl, cleanYouTubeUrl, isInstagramLink } from '@/lib/urlCleaners';

describe('cleanYouTubeUrl', () => {
  it('drops share parameters from a youtu.be link', () => {
    expect(cleanYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=xyz&pp=abc')).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('keeps the v and list parameters of a watch link and drops the rest', () => {
    expect(cleanYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz&list=PLuhl9TnQPDCnWIhy&index=4')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLuhl9TnQPDCnWIhy');
    expect(cleanYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('turns a youtu.be link with a playlist into a watch link that keeps it', () => {
    expect(cleanYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?list=PLuhl9TnQPDCnWIhy&si=xyz')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLuhl9TnQPDCnWIhy');
  });

  it('cleans a playlist link', () => {
    expect(cleanYouTubeUrl('https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI&si=xyz')).toBe('https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI');
    expect(cleanYouTubeUrl('https://music.youtube.com/playlist?list=PLuhl9TnQPDCnWIhy')).toBe('https://www.youtube.com/playlist?list=PLuhl9TnQPDCnWIhy');
  });

  it('cleans a Shorts link and a channel link, keeping the channel tab', () => {
    expect(cleanYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ?si=xyz')).toBe('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    expect(cleanYouTubeUrl('https://www.youtube.com/@somechannel/videos?si=xyz')).toBe('https://www.youtube.com/@somechannel/videos');
    expect(cleanYouTubeUrl('https://www.youtube.com/@somechannel/streams?si=xyz')).toBe('https://www.youtube.com/@somechannel/streams');
    expect(cleanYouTubeUrl('https://www.youtube.com/@somechannel/playlists')).toBe('https://www.youtube.com/@somechannel/playlists');
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
