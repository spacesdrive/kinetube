import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CommandPalette from '@/components/shell/CommandPalette';

function renderPalette() {
  const onRun = vi.fn();
  const onClose = vi.fn();
  render(<CommandPalette onRun={onRun} onClose={onClose} />);
  return { onRun, onClose, input: screen.getByRole('combobox', { name: 'Search commands or paste a link' }) };
}

describe('CommandPalette', () => {
  it('filters as the person types and runs the highlighted command on Enter', () => {
    const { onRun, onClose, input } = renderPalette();
    fireEvent.change(input, { target: { value: 'settings' } });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['SettingsGo to']);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRun).toHaveBeenCalledWith({ kind: 'page', page: 'settings' });
    expect(onClose).toHaveBeenCalled();
  });

  it('moves the highlight with the arrow keys', () => {
    const { onRun, input } = renderPalette();
    fireEvent.change(input, { target: { value: 'theme' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRun).toHaveBeenCalledWith({ kind: 'theme', theme: 'dark' });
  });

  it('offers to fetch a pasted link', () => {
    const { onRun, input } = renderPalette();
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/playlist?list=PLuhl9TnQPDCnWIhy' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRun).toHaveBeenCalledWith({ kind: 'fetch', url: 'https://www.youtube.com/playlist?list=PLuhl9TnQPDCnWIhy' });
  });

  it('says so when nothing matches', () => {
    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: 'banana' } });
    expect(screen.getByText('Nothing matches "banana".')).toBeTruthy();
  });
});
