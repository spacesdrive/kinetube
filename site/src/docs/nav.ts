import type { ComponentType } from 'react';
import { BookOpen, Cpu, FileText, FolderDown, FolderOpen, Keyboard, Monitor, Rocket, Settings, ShieldCheck, TriangleAlert, Users, Workflow } from 'lucide-react';

import { InstagramIcon, YouTubeIcon } from '@/components/marks';

// the docs tabs, sidebar groups and pages; each page is content/docs/<slug>.mdx, and '' is index.mdx

export interface DocPageEntry {
  slug: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
}

export interface DocGroup {
  label: string;
  pages: DocPageEntry[];
}

export interface DocTab {
  id: string;
  label: string;
  groups: DocGroup[];
}

export const DOC_TABS: DocTab[] = [
  {
    id: 'start',
    label: 'Get started',
    groups: [
      {
        label: 'Start here',
        pages: [
          { slug: '', title: 'Introduction', icon: BookOpen },
          { slug: 'install', title: 'Install', icon: FolderDown },
          { slug: 'first-start', title: 'First start', icon: Rocket },
          { slug: 'where-files-go', title: 'Where files go', icon: FolderOpen },
        ],
      },
    ],
  },
  {
    id: 'guides',
    label: 'Guides',
    groups: [
      {
        label: 'Use kinetube',
        pages: [
          { slug: 'guides/youtube', title: 'Download from YouTube', icon: YouTubeIcon },
          { slug: 'guides/transcribe', title: 'Transcribe', icon: FileText },
          { slug: 'guides/instagram', title: 'Instagram', icon: InstagramIcon },
        ],
      },
      {
        label: 'Set it up',
        pages: [
          { slug: 'guides/settings', title: 'Settings', icon: Settings },
          { slug: 'guides/shortcuts', title: 'Keyboard shortcuts', icon: Keyboard },
        ],
      },
    ],
  },
  {
    id: 'reference',
    label: 'Reference',
    groups: [
      {
        label: 'Reference',
        pages: [
          { slug: 'reference/privacy', title: 'Privacy', icon: ShieldCheck },
          { slug: 'reference/limitations', title: 'Known limitations', icon: TriangleAlert },
          { slug: 'reference/platforms', title: 'Cross-platform status', icon: Monitor },
        ],
      },
    ],
  },
  {
    id: 'contribute',
    label: 'Contribute',
    groups: [
      {
        label: 'Contribute',
        pages: [
          { slug: 'contribute/run-from-source', title: 'Run from source', icon: Cpu },
          { slug: 'contribute/how-it-works', title: 'How it works', icon: Workflow },
          { slug: 'contribute/contributing', title: 'Contributing', icon: Users },
        ],
      },
    ],
  },
];

export interface DocEntry extends DocPageEntry {
  tab: DocTab;
  group: DocGroup;
  path: string;
}

export const DOC_ENTRIES: DocEntry[] = DOC_TABS.flatMap((tab) =>
  tab.groups.flatMap((group) => group.pages.map((page) => ({ ...page, tab, group, path: page.slug ? `/docs/${page.slug}` : '/docs' }))),
);

export function docEntry(slug: string): DocEntry | undefined {
  return DOC_ENTRIES.find((entry) => entry.slug === slug);
}

export function docNeighbours(slug: string): { previous: DocEntry | null; next: DocEntry | null } {
  const index = DOC_ENTRIES.findIndex((entry) => entry.slug === slug);
  return { previous: DOC_ENTRIES[index - 1] ?? null, next: DOC_ENTRIES[index + 1] ?? null };
}

// the slug of a docs address: /docs/guides/settings -> guides/settings, /docs -> ''
export function slugFromPath(pathname: string): string {
  return pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');
}

export function firstPathOf(tab: DocTab): string {
  const first = tab.groups[0]?.pages[0];
  return first?.slug ? `/docs/${first.slug}` : '/docs';
}
