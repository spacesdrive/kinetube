import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';

import { whisperBinaryName } from '../../../src/managers/whisper/whisperBinary.ts';
import { modelPath, WHISPER_MODEL_IDS, WHISPER_MODELS } from '../../../src/managers/whisper/whisperModels.ts';
import { cleanTranscription } from '../../../src/managers/whisper/whisperTranscript.ts';

describe('cleanTranscription', () => {
  test('timestamp markers are removed', () => {
    const raw = '[00:00:00.000 --> 00:00:02.500] Hello there.\n[00:00:02.500 --> 00:00:05.000] General Kenobi.';
    assert.equal(cleanTranscription(raw), 'Hello there. General Kenobi.');
  });

  test('lines join into one paragraph, whatever the line endings', () => {
    assert.equal(cleanTranscription('Line one.\nLine two.\n\nLine three.'), 'Line one. Line two. Line three.');
    assert.equal(cleanTranscription('First.\r\nSecond.\r\n'), 'First. Second.');
  });

  test('repeated spaces collapse and empty input stays empty', () => {
    assert.equal(cleanTranscription('  Hello   world.  \n\n\n   Goodbye.   '), 'Hello world. Goodbye.');
    assert.equal(cleanTranscription('   \n\n  \n'), '');
  });
});

describe('whisper models', () => {
  test('exactly the five documented sizes exist', () => {
    assert.deepEqual([...WHISPER_MODEL_IDS].sort(), ['base', 'large', 'medium', 'small', 'tiny']);
  });

  test('every model has a label, a .bin file and a positive size', () => {
    for (const modelId of WHISPER_MODEL_IDS) {
      const model = WHISPER_MODELS[modelId];
      assert.equal(typeof model.label, 'string');
      assert.match(model.fileName, /\.bin$/);
      assert.ok(model.sizeMb > 0);
    }
  });

  test('a model lives in the models folder under its file name', () => {
    assert.equal(modelPath('/models', 'base'), path.join('/models', 'ggml-base.bin'));
  });
});

describe('whisperBinaryName', () => {
  test('only Windows gives whisper-cli an .exe name', () => {
    assert.equal(whisperBinaryName('win32'), 'whisper-cli.exe');
    assert.equal(whisperBinaryName('darwin'), 'whisper-cli');
    assert.equal(whisperBinaryName('linux'), 'whisper-cli');
  });
});
