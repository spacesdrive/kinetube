import { describe, expect, it } from 'vitest';

import { ALL_COMMANDS, filterCommands } from '@/lib/commands';

describe('filterCommands', () => {
  it('lists every command for an empty query', () => {
    expect(filterCommands('', false)).toHaveLength(ALL_COMMANDS.length);
  });

  it('matches every typed word against the label and the keywords, in any order', () => {
    expect(filterCommands('settings', false).map((command) => command.id)).toEqual(['page-settings']);
    expect(filterCommands('theme dark', false).map((command) => command.id)).toEqual(['theme-dark']);
    expect(filterCommands('playlist', false).map((command) => command.id)).toEqual(['page-youtube']);
  });

  it('finds nothing when one word matches nothing', () => {
    expect(filterCommands('settings banana', false)).toEqual([]);
  });

  it('turns a pasted link into a single fetch command', () => {
    const [command, ...rest] = filterCommands('  https://youtu.be/dQw4w9WgXcQ ', true);
    expect(rest).toEqual([]);
    expect(command?.action).toEqual({ kind: 'fetch', url: 'https://youtu.be/dQw4w9WgXcQ' });
  });
});
