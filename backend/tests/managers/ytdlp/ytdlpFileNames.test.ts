import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildFileNameTemplate, finalFilePath, sanitizeNamePart, titleFromPath } from '../../../src/managers/ytdlp/ytdlpFileNames.ts';

describe('file names', () => {
  test('the default name is the title plus the video id', () => {
    assert.equal(buildFileNameTemplate({ prefix: '', suffix: '', template: '', sequenceNumber: null }), '%(title)s [%(id)s].%(ext)s');
  });

  test('numbering, prefix and suffix wrap the title in that order', () => {
    const template = buildFileNameTemplate({ prefix: 'Clip', suffix: 'final', template: '', sequenceNumber: 3 });
    assert.equal(template, '03 - Clip %(title)s final [%(id)s].%(ext)s');
  });

  test('a custom template owns the whole name, so no id is added', () => {
    assert.equal(buildFileNameTemplate({ prefix: '', suffix: '', template: '%(uploader)s - %(title)s', sequenceNumber: null }), '%(uploader)s - %(title)s.%(ext)s');
  });

  test('typed text cannot inject template fields or characters Windows rejects', () => {
    assert.equal(sanitizeNamePart(' 100% <done>?  '), '100%% done');
  });

  test('a yt-dlp file name reads back as a clean title', () => {
    assert.equal(titleFromPath('/out/My_Title [abc123XYZ].f140.m4a'), 'My Title');
    assert.equal(titleFromPath('C:/out/My_Title [abc123XYZ].mp4'), 'My Title');
    assert.equal(titleFromPath('C:/out/01 - video.fdash-1321893019914509v.mp4'), '01 - video');
  });

  test('the saved file is the merged mp4 or the converted mp3, not the first stream', () => {
    assert.equal(finalFilePath('/out/Title.f299.webm', true, false), '/out/Title.mp4');
    // Instagram's format ids are not numbers
    assert.equal(finalFilePath('C:/out/01 - video.fdash-1321893019914509v.mp4', true, false), 'C:/out/01 - video.mp4');
    assert.equal(finalFilePath('/out/Clip.fhls-1080p.mp4', true, false), '/out/Clip.mp4');
    assert.equal(finalFilePath('/out/Title.webm', false, true), '/out/Title.mp3');
    assert.equal(finalFilePath('/out/Title.mp4', false, false), '/out/Title.mp4');
  });
});
