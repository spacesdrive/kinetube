import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
// written as escapes so this file never holds the characters it looks for
const DASHES = /[–—]/;
const EMOJI = /\p{Extended_Pictographic}/u;

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return filesIn(full);
    return /\.(tsx?|mdx|html|css)$/.test(name) ? [full] : [];
  });
}

const FILES = [...filesIn(path.join(ROOT, 'src')), ...filesIn(path.join(ROOT, 'content')), path.join(ROOT, 'index.html')];

describe('site copy', () => {
  it('has no em or en dashes and no emoji', () => {
    const problems = FILES.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return DASHES.test(text) || EMOJI.test(text);
    });
    expect(problems.map((file) => path.relative(ROOT, file))).toEqual([]);
  });

  it('never uses a spaced hyphen as a dash in the docs', () => {
    const problems = filesIn(path.join(ROOT, 'content')).filter((file) => / - [A-Za-z]/.test(readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '')));
    expect(problems.map((file) => path.relative(ROOT, file))).toEqual([]);
  });
});
