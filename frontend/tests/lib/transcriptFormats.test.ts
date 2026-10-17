import { describe, expect, it } from 'vitest';

import { cleanFormats, formatList, formatsOfFiles } from '@/lib/transcriptFormats';
import { transcriptFileName } from '@/lib/saveTextFile';

describe('transcript formats', () => {
  it('names a saved transcript after the media file', () => {
    expect(transcriptFileName('clip.mp4', 'srt')).toBe('clip.srt');
    expect(transcriptFileName('talk.final.webm', 'txt')).toBe('talk.final.txt');
  });

  it('reads the formats back from the files written', () => {
    expect(formatsOfFiles(['C:\\Videos\\clip.srt', '/home/me/clip.txt', '/a/notes.docx'])).toEqual(['srt', 'txt']);
  });

  it('lists formats in a fixed order, joined like a sentence', () => {
    expect(formatList(['srt', 'txt'])).toBe('TXT and SRT');
    expect(formatList(['json', 'vtt', 'txt'])).toBe('TXT, VTT and JSON');
    expect(formatList(['lrc'])).toBe('LRC');
    expect(formatList([])).toBe('');
  });

  it('keeps only known formats from a stored list, and falls back to plain text', () => {
    expect(cleanFormats(['vtt', 'docx', 'txt'])).toEqual(['txt', 'vtt']);
    expect(cleanFormats([])).toEqual(['txt']);
    expect(cleanFormats('srt')).toEqual(['txt']);
  });
});
