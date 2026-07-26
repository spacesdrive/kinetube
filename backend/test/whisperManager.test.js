const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { cleanTranscription, MODELS, getModelPath, getWhisperBinaryName } = require('../utils/whisperManager');
const { MODELS_DIR } = require('../utils/paths');

describe('cleanTranscription', () => {
  test('strips whisper.cpp timestamp markers', () => {
    const raw = '[00:00:00.000 --> 00:00:02.500] Hello there.\n[00:00:02.500 --> 00:00:05.000] General Kenobi.';
    assert.equal(cleanTranscription(raw), 'Hello there. General Kenobi.');
  });

  test('collapses multiple lines into flowing paragraphs', () => {
    const raw = 'Line one.\nLine two.\n\nLine three.';
    assert.equal(cleanTranscription(raw), 'Line one. Line two. Line three.');
  });

  test('normalizes Windows line endings before splitting', () => {
    const raw = 'First.\r\nSecond.\r\n';
    assert.equal(cleanTranscription(raw), 'First. Second.');
  });

  test('drops empty lines and collapses repeated whitespace', () => {
    const raw = '  Hello   world.  \n\n\n   Goodbye.   ';
    assert.equal(cleanTranscription(raw), 'Hello world. Goodbye.');
  });

  test('returns an empty string for whitespace-only input', () => {
    assert.equal(cleanTranscription('   \n\n  \n'), '');
  });
});

describe('MODELS registry', () => {
  test('exposes exactly the five documented model sizes', () => {
    assert.deepEqual(Object.keys(MODELS).sort(), ['base', 'large', 'medium', 'small', 'tiny'].sort());
  });

  test('every model entry has a label, a .bin file, and a positive size', () => {
    for (const [key, model] of Object.entries(MODELS)) {
      assert.equal(typeof model.label, 'string', `${key}.label should be a string`);
      assert.match(model.file, /\.bin$/, `${key}.file should end in .bin`);
      assert.ok(model.sizeMB > 0, `${key}.sizeMB should be positive`);
    }
  });
});

describe('getModelPath', () => {
  test('resolves a known model key to its .bin file under MODELS_DIR', () => {
    const result = getModelPath('base');
    assert.equal(path.basename(result), 'ggml-base.bin');
  });

  test('returns the models directory itself for an unknown key', () => {
    const result = getModelPath('not-a-real-model');
    assert.equal(result, path.join(MODELS_DIR, ''));
  });
});

describe('getWhisperBinaryName', () => {
  test('uses .exe only on Windows; macOS/Linux use the bare whisper-cli name', () => {
    assert.equal(getWhisperBinaryName('win32'), 'whisper-cli.exe');
    assert.equal(getWhisperBinaryName('darwin'), 'whisper-cli');
    assert.equal(getWhisperBinaryName('linux'), 'whisper-cli');
  });
});
