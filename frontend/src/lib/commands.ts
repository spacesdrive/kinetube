import type { Page } from './pages';

export type ThemeChoice = 'light' | 'dark' | 'system';

// next-themes stores any string; anything it doesn't know means following the system
export function asThemeChoice(theme: string | undefined): ThemeChoice {
  return theme === 'light' || theme === 'dark' ? theme : 'system';
}

export type CommandAction =
  | { kind: 'page'; page: Page }
  | { kind: 'theme'; theme: ThemeChoice }
  | { kind: 'fetch'; url: string }
  | { kind: 'paste' };

export interface Command {
  id: string;
  label: string;
  group: 'Fetch' | 'Go to' | 'Appearance';
  keywords: string;
  action: CommandAction;
}

const PAGE_COMMANDS: Command[] = [
  { id: 'page-youtube', label: 'YouTube', group: 'Go to', keywords: 'video shorts channel playlist download', action: { kind: 'page', page: 'youtube' } },
  { id: 'page-instagram', label: 'Instagram', group: 'Go to', keywords: 'reel post story profile download', action: { kind: 'page', page: 'instagram' } },
  { id: 'page-batch', label: 'Batch download', group: 'Go to', keywords: 'many links list queue bulk', action: { kind: 'page', page: 'batch' } },
  { id: 'page-transcribe', label: 'Transcribe', group: 'Go to', keywords: 'whisper text transcript audio file', action: { kind: 'page', page: 'transcribe' } },
  { id: 'page-settings', label: 'Settings', group: 'Go to', keywords: 'preferences folder quality model update version', action: { kind: 'page', page: 'settings' } },
];

const THEME_COMMANDS: Command[] = [
  { id: 'theme-light', label: 'Use the light theme', group: 'Appearance', keywords: 'theme light bright day', action: { kind: 'theme', theme: 'light' } },
  { id: 'theme-dark', label: 'Use the dark theme', group: 'Appearance', keywords: 'theme dark night', action: { kind: 'theme', theme: 'dark' } },
  { id: 'theme-system', label: 'Match the system theme', group: 'Appearance', keywords: 'theme system auto', action: { kind: 'theme', theme: 'system' } },
];

const PASTE_COMMAND: Command = { id: 'paste', label: 'Fetch the link on the clipboard', group: 'Fetch', keywords: 'paste clipboard link fetch', action: { kind: 'paste' } };

export const ALL_COMMANDS: readonly Command[] = [PASTE_COMMAND, ...PAGE_COMMANDS, ...THEME_COMMANDS];

// every word typed has to appear in the label or the keywords, in any order
function matches(command: Command, words: string[]): boolean {
  const haystack = `${command.label} ${command.keywords}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

// a pasted link becomes the first command, so Enter fetches it straight away
export function filterCommands(query: string, isLink: boolean): Command[] {
  const trimmed = query.trim();
  if (isLink) {
    return [{ id: 'fetch-typed', label: `Fetch ${trimmed}`, group: 'Fetch', keywords: '', action: { kind: 'fetch', url: trimmed } }];
  }
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  return ALL_COMMANDS.filter((command) => matches(command, words));
}
