import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ResumeDownloadsBanner from '@/features/downloads/ResumeDownloadsBanner';

import type { Download } from '@shared/downloads.ts';

function record(id: string, title: string): Download {
  return {
    id,
    platform: 'youtube',
    url: `https://youtu.be/${id}`,
    title,
    status: 'interrupted',
    options: { quality: 'best', isAudioOnly: false, outputDir: null, fileName: { prefix: '', suffix: '', template: '', sequenceNumber: null }, account: null },
    startedAt: '',
    pausedAt: null,
  };
}

describe('ResumeDownloadsBanner', () => {
  it('renders nothing when there is nothing to resume', () => {
    const { container } = render(<ResumeDownloadsBanner downloads={[]} onResume={vi.fn()} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('uses the singular for one download and shows its title', () => {
    render(<ResumeDownloadsBanner downloads={[record('a1', 'My Video')]} onResume={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Resume the unfinished download?')).toBeTruthy();
    expect(screen.getByText('My Video')).toBeTruthy();
  });

  it('uses the plural for several, and shows the link while the title is still unknown', () => {
    render(<ResumeDownloadsBanner downloads={[record('x', ''), record('y', '')]} onResume={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Resume 2 unfinished downloads?')).toBeTruthy();
    expect(screen.getByText('https://youtu.be/x')).toBeTruthy();
  });

  it('passes the chosen download to onResume and to onDismiss', () => {
    const onResume = vi.fn();
    const onDismiss = vi.fn();
    const download = record('a1', 'My Video');
    render(<ResumeDownloadsBanner downloads={[download]} onResume={onResume} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /Resume/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Dismiss/ }));
    expect(onResume).toHaveBeenCalledWith(download);
    expect(onDismiss).toHaveBeenCalledWith(download);
  });
});
