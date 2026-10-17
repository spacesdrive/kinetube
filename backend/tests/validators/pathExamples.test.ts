import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { exampleFilePath, exampleFolderPath } from '../../src/validators/pathExamples.ts';

describe('path examples', () => {
  test('each platform gets a folder example in its own path style', () => {
    assert.equal(exampleFolderPath('win32'), 'C:\\Users\\you\\Videos');
    assert.equal(exampleFolderPath('darwin'), '/Users/you/Movies');
    assert.equal(exampleFolderPath('linux'), '/home/you/Videos');
  });

  test('a file example sits inside the folder example with the platform separator', () => {
    assert.equal(exampleFilePath('win32'), 'C:\\Users\\you\\Videos\\clip.mp4');
    assert.equal(exampleFilePath('darwin'), '/Users/you/Movies/clip.mp4');
    assert.equal(exampleFilePath('linux'), '/home/you/Videos/clip.mp4');
  });
});
