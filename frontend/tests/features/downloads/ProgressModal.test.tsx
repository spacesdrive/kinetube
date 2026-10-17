import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createBulkDownload } from '@/features/downloads/bulkDownloadState';
import ProgressModal from '@/features/downloads/ProgressModal';
import { createSingleDownload } from '@/features/downloads/singleDownloadState';

import type { ProgressModalProps } from '@/features/downloads/ProgressModal';
import type { SingleDownloadState } from '@/features/downloads/singleDownloadState';

function single(changes: Partial<SingleDownloadState> = {}): SingleDownloadState {
  return { ...createSingleDownload('My Video', '1080p', false), ...changes };
}

function renderModal(props: Partial<ProgressModalProps> & Pick<ProgressModalProps, 'download'>) {
  const handlers = { onClose: vi.fn(), onCancel: vi.fn(), onPause: vi.fn(), onResume: vi.fn(), onTranscribe: vi.fn() };
  render(<ProgressModal isTranscribing={false} transcript={null} {...handlers} {...props} />);
  return handlers;
}

describe('ProgressModal for one download', () => {
  it('shows the title, percent, phase and quality while it runs', () => {
    renderModal({ download: single({ percent: 42.7, phaseLabel: 'Downloading video...' }) });
    expect(screen.getByText('My Video')).toBeTruthy();
    expect(screen.getByText('42.7%')).toBeTruthy();
    expect(screen.getByText('Downloading video...')).toBeTruthy();
    expect(screen.getByText(/1080p/)).toBeTruthy();
  });

  it('offers Pause and Cancel while running, and Pause calls onPause', () => {
    const { onPause } = renderModal({ download: single() });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('offers Resume once paused, and Resume calls onResume', () => {
    const { onResume } = renderModal({ download: single({ status: 'paused', phaseLabel: 'Paused' }) });
    expect(screen.getAllByText('Paused').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Resume/ }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('shows the success message with Close, and offers to transcribe the saved file', () => {
    const { onTranscribe } = renderModal({ download: single({ status: 'done', isSuccess: true, message: 'Download complete', filePath: 'C:/videos/clip.mp4' }) });
    expect(screen.getByText('Download complete')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: 'Transcribe this file' }));
    expect(onTranscribe).toHaveBeenCalledWith('C:/videos/clip.mp4');
  });

  it('shows the failure message when the download fails', () => {
    renderModal({ download: single({ status: 'done', isSuccess: false, message: 'The download failed. Private video' }) });
    expect(screen.getByText('The download failed. Private video')).toBeTruthy();
  });

  it('shows the transcript and its word count once transcription finishes', () => {
    renderModal({
      download: single({ status: 'done', isSuccess: true, message: 'Download complete', filePath: '/a.mp4' }),
      transcript: { kind: 'text', text: 'one two three', outputPath: '/a.txt' },
    });
    expect(screen.getByText(/3 words/)).toBeTruthy();
  });
});

describe('ProgressModal for a bulk download', () => {
  const items = ['A', 'B', 'C'].map((title) => ({ key: title, url: `https://youtu.be/${title}`, title: `Video ${title}`, platform: 'youtube' as const, shouldTranscribe: false }));

  it('shows totals and lists the running item in two places', () => {
    const created = createBulkDownload(items);
    const changes = [{ status: 'done', isSuccess: true }, { status: 'done', isSuccess: false }, { status: 'running', percent: 30 }] as const;
    const download = { ...created, items: created.items.map((item, index) => ({ ...item, ...changes[index] })) };
    renderModal({ download });

    expect(screen.getByText('Bulk download')).toBeTruthy();
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(screen.getByText(/1 done/)).toBeTruthy();
    expect(screen.getByText(/1 failed/)).toBeTruthy();
    expect(screen.getAllByText('Video C').length).toBe(2);
  });

  it('offers Close instead of Cancel once every item is done', () => {
    const download = { ...createBulkDownload(items.slice(0, 1)), isFinished: true };
    renderModal({ download });
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Cancel downloads' })).toBeNull();
  });
});
