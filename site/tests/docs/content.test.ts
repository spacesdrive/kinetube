import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { listDocs, pageDescription, pageTitle } from '../../build/docsPlugin.ts';
import { DOC_ENTRIES } from '@/docs/nav';

const DOCS = listDocs(path.resolve(import.meta.dirname, '../../content/docs'));
const SLUGS = new Set(DOCS.map((doc) => doc.slug));

describe('docs content', () => {
  it('has a page for every sidebar entry', () => {
    const missing = DOC_ENTRIES.filter((entry) => !SLUGS.has(entry.slug)).map((entry) => entry.slug);
    expect(missing).toEqual([]);
  });

  it('lists every page in the sidebar', () => {
    const listed = new Set(DOC_ENTRIES.map((entry) => entry.slug));
    expect(DOCS.filter((doc) => !listed.has(doc.slug)).map((doc) => doc.slug)).toEqual([]);
  });

  it('gives every page a title and a description', () => {
    for (const doc of DOCS) {
      expect(pageTitle(doc.source, ''), doc.slug).not.toBe('');
      expect(pageDescription(doc.source), doc.slug).not.toBe('');
    }
  });

  it('only links to docs pages that exist', () => {
    for (const doc of DOCS) {
      for (const [, target] of doc.source.matchAll(/\]\((\/docs[^)#\s]*)/g)) {
        const slug = (target ?? '').replace(/^\/docs\/?/, '');
        expect(SLUGS.has(slug), `${doc.slug} links to ${target}`).toBe(true);
      }
    }
  });
});
