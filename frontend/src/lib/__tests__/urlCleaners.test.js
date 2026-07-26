import { describe, it, expect } from 'vitest';
import { cleanYouTubeUrl, cleanInstagramUrl } from '../urlCleaners';

describe('cleanYouTubeUrl', () => {
  it('strips tracking params from a youtu.be short link', () => {
    expect(cleanYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=xyz&pp=abc')).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('keeps only the v param on a /watch URL', () => {
    expect(cleanYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz&list=PL123')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
  });

  it('cleans a Shorts URL', () => {
    expect(cleanYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ?si=xyz')).toBe(
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    );
  });

  it('cleans a channel handle URL, dropping query params', () => {
    expect(cleanYouTubeUrl('https://www.youtube.com/@somechannel/videos?si=xyz')).toBe(
      'https://www.youtube.com/@somechannel/videos',
    );
  });

  it('adds a missing protocol before parsing', () => {
    expect(cleanYouTubeUrl('youtu.be/dQw4w9WgXcQ')).toBe('https://youtu.be/dQw4w9WgXcQ');
  });

  it('returns a non-YouTube URL unchanged', () => {
    expect(cleanYouTubeUrl('https://vimeo.com/12345')).toBe('https://vimeo.com/12345');
  });

  it('returns non-string/empty input unchanged', () => {
    expect(cleanYouTubeUrl('')).toBe('');
    expect(cleanYouTubeUrl(null)).toBe(null);
    expect(cleanYouTubeUrl(undefined)).toBe(undefined);
  });

  it('falls back to the trimmed input when the URL fails to parse', () => {
    expect(cleanYouTubeUrl('   not a url   ')).toBe('not a url');
  });
});

describe('cleanInstagramUrl', () => {
  it('strips tracking params from a reel URL', () => {
    expect(cleanInstagramUrl('https://www.instagram.com/reel/ABC123xyz/?igsh=xyz&utm_source=ig_web_copy_link')).toBe(
      'https://www.instagram.com/reel/ABC123xyz/',
    );
  });

  it('cleans a post URL', () => {
    expect(cleanInstagramUrl('https://www.instagram.com/p/ABC123xyz/?igsh=xyz')).toBe(
      'https://www.instagram.com/p/ABC123xyz/',
    );
  });

  it('cleans a stories URL, keeping the full path', () => {
    expect(cleanInstagramUrl('https://www.instagram.com/stories/someuser/1234567890?utm_source=qr')).toBe(
      'https://www.instagram.com/stories/someuser/1234567890/',
    );
  });

  it('cleans a bare profile URL', () => {
    expect(cleanInstagramUrl('instagram.com/someuser?hl=en')).toBe('https://www.instagram.com/someuser/');
  });

  it('returns a non-Instagram URL unchanged', () => {
    expect(cleanInstagramUrl('https://twitter.com/someone')).toBe('https://twitter.com/someone');
  });

  it('returns non-string/empty input unchanged', () => {
    expect(cleanInstagramUrl('')).toBe('');
    expect(cleanInstagramUrl(null)).toBe(null);
  });
});
