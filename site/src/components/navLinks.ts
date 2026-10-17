import type { ComponentType } from 'react';
import { BookOpen, Cpu, FileText, FolderDown, GitBranch, History, Layers, ListChecks, Pause, Rocket, Settings, ShieldCheck } from 'lucide-react';

import { CHANGELOG_URL, GITHUB_URL } from '@/lib/links';

import { GitHubIcon, InstagramIcon, YouTubeIcon } from './marks';

export interface MenuItem {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export interface MenuColumn {
  heading: string;
  items: MenuItem[];
}

export interface Menu {
  id: string;
  label: string;
  columns: MenuColumn[];
}

// wide and short: each menu is two or three columns side by side, and every item opens a real section or page
export const MENUS: Menu[] = [
  {
    id: 'product',
    label: 'Product',
    columns: [
      {
        heading: 'Download',
        items: [
          { title: 'YouTube', description: 'Videos, Shorts and MP3, up to 4K', href: '/#youtube', icon: YouTubeIcon },
          { title: 'Playlists and channels', description: 'Tick the videos you want', href: '/docs/guides/youtube', icon: ListChecks },
          { title: 'Instagram', description: 'Posts, reels, stories and profiles', href: '/#instagram', icon: InstagramIcon },
        ],
      },
      {
        heading: 'Work with files',
        items: [
          { title: 'Transcription', description: 'Whisper, on your own computer', href: '/#transcribe', icon: FileText },
          { title: 'Batch download', description: 'Many links in one run', href: '/#details', icon: Layers },
          { title: 'Pause and resume', description: 'Pick a download up later', href: '/#details', icon: Pause },
        ],
      },
      {
        heading: 'Open source',
        items: [
          { title: 'GitHub', description: 'Read every line', href: GITHUB_URL, icon: GitHubIcon },
          { title: 'The tools inside', description: 'yt-dlp, FFmpeg, whisper.cpp', href: '/#tools', icon: Cpu },
          { title: 'Changelog', description: 'What changed in each release', href: CHANGELOG_URL, icon: History },
        ],
      },
    ],
  },
  {
    id: 'docs',
    label: 'Docs',
    columns: [
      {
        heading: 'Start',
        items: [
          { title: 'Install', description: 'Pick the file for your system', href: '/docs/install', icon: FolderDown },
          { title: 'First start', description: 'What kinetube sets up for you', href: '/docs/first-start', icon: Rocket },
          { title: 'User guide', description: 'Every page of the app', href: '/docs', icon: BookOpen },
        ],
      },
      {
        heading: 'Learn more',
        items: [
          { title: 'Settings', description: 'Folders, file names and more', href: '/docs/guides/settings', icon: Settings },
          { title: 'Privacy', description: 'What kinetube connects to', href: '/docs/reference/privacy', icon: ShieldCheck },
          { title: 'Contribute', description: 'Run it from source', href: '/docs/contribute/run-from-source', icon: GitBranch },
        ],
      },
    ],
  },
];
