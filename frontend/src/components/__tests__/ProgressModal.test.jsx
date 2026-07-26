import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressModal from '../ProgressModal';

describe('ProgressModal', () => {
  it('renders nothing when there is no active download', () => {
    const { container } = render(<ProgressModal download={null} onClose={vi.fn()} onCancel={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the in-progress percentage and phase label for a single download', () => {
    render(
      <ProgressModal
        download={{ title: 'My Video', percent: 42.7, phaseLabel: 'Downloading', speed: '2.1MiB/s', quality: '1080p' }}
        onClose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('My Video')).toBeTruthy();
    expect(screen.getByText('42.7%')).toBeTruthy();
    expect(screen.getByText('Downloading')).toBeTruthy();
    expect(screen.getByText(/1080p/)).toBeTruthy();
  });

  it('shows the success message and a Close button once a single download is done', () => {
    render(
      <ProgressModal
        download={{ title: 'My Video', done: true, success: true, message: 'Download complete' }}
        onClose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Download complete')).toBeTruthy();
    // The dialog primitive itself also renders an auto-included icon close
    // button accessibly named "Close", alongside the app's own Close button.
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the failure message when a single download fails', () => {
    render(
      <ProgressModal
        download={{ title: 'My Video', done: true, success: false, message: 'yt-dlp exited with code 1' }}
        onClose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('yt-dlp exited with code 1')).toBeTruthy();
  });

  it('shows a Transcribe button once a successful download has a filePath', () => {
    render(
      <ProgressModal
        download={{ title: 'My Video', done: true, success: true, message: 'Done', filePath: 'C:/videos/my-video.mp4' }}
        onClose={vi.fn()}
        onCancel={vi.fn()}
        onTranscribe={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Transcribe this file' })).toBeTruthy();
  });

  it('renders a Cancel Download button while a single download is still in progress', () => {
    render(
      <ProgressModal
        download={{ title: 'My Video', percent: 10, done: false }}
        onClose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel Download' })).toBeTruthy();
  });

  it('renders bulk-download totals and per-item status', () => {
    render(
      <ProgressModal
        download={{
          items: [
            { id: '1', title: 'Video A', done: true, success: true },
            { id: '2', title: 'Video B', done: true, success: false },
            { id: '3', title: 'Video C', done: false, percent: 30 },
          ],
        }}
        onClose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Bulk Download')).toBeTruthy();
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(screen.getByText(/1 done/)).toBeTruthy();
    expect(screen.getByText(/1 failed/)).toBeTruthy();
    // "Video C" is the in-progress item, so it legitimately renders twice:
    // once in the "Now downloading" panel and once in the queue list below.
    expect(screen.getAllByText('Video C').length).toBe(2);
  });

  it('shows Close (not Cancel) for a bulk download once every item is done', () => {
    render(
      <ProgressModal
        download={{
          items: [
            { id: '1', title: 'Video A', done: true, success: true },
            { id: '2', title: 'Video B', done: true, success: true },
          ],
        }}
        onClose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Cancel Downloads' })).toBeNull();
  });
});
