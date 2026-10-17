import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VideoEntryRow from '@/features/youtube/VideoEntryRow';

import type { VideoEntry } from '@shared/youtube.ts';

const VIDEO: VideoEntry = {
  id: 'IwZVXmQdX1E',
  title: 'NASA Moon Base: The First Six Months',
  url: 'https://www.youtube.com/watch?v=IwZVXmQdX1E',
  thumbnailUrl: 'https://i.ytimg.com/vi/IwZVXmQdX1E/hqdefault.jpg',
  duration: 67,
  durationText: '1:07',
  viewCount: 523000,
  uploadDate: '20260908',
  status: 'available',
};

describe('VideoEntryRow', () => {
  // Base UI throws when a menu label sits outside a group, and the throw used to blank the app
  it('opens the download menu with its label and downloads the quality picked', async () => {
    const onDownload = vi.fn();
    render(<ul><VideoEntryRow video={VIDEO} isSelected={false} shouldTranscribe={false} onToggle={vi.fn()} onToggleTranscribe={vi.fn()} onDownload={onDownload} /></ul>);

    fireEvent.click(screen.getByRole('button', { name: `Download ${VIDEO.title}` }));
    expect(await screen.findByText('Download as')).toBeTruthy();

    fireEvent.click(screen.getByRole('menuitem', { name: '720p HD' }));
    expect(onDownload).toHaveBeenCalledWith(VIDEO, '720p', false);
  });
});
