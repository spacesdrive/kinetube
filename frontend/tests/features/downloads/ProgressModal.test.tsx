import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createBulkDownload } from '@/features/downloads/bulkDownloadState';
import ProgressModal from '@/features/downloads/ProgressModal';
import { createSingleDownload } from '@/features/downloads/singleDownloadState';

import type { ProgressModalProps } from '@/features/downloads/ProgressModal';
import type { SingleDownloadState } from '@/features/downloads/singleDownloadState';
import type { TranscriptFiles } from '@shared/transcriptions.ts';

// every format of a short transcript, as the backend sends them
const TRANSCRIPTS: TranscriptFiles = {
  txt: 'one two three\n',
  srt: '1\n00:00:00,000 --> 00:00:01,000\none two three\n',
  vtt: 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\none two three\n',
  lrc: '[00:00.00]one two three\n',
  csv: 'start,end,text\n0,1000,"one two three"\n',
  tsv: 'start\tend\ttext\n0\t1000\tone two three\n',
  json: '{}\n',
};

function single(changes: Partial<SingleDownloadState> = {}): SingleDownloadState {
  return { ...createSingleDownload('My Video', '1080p', false), ...changes };
}

function renderModal(props: Partial<ProgressModalProps> & Pick<ProgressModalProps, 'download'>) {
  const handlers = { onClose: vi.fn(), onCancel: vi.fn(), onPause: vi.fn(), onResume: vi.fn(), onTranscribe: vi.fn(), onStopTranscribing: vi.fn() };
  render(<ProgressModal isTranscribing={false} transcribePercent={0} transcript={null} {...handlers} {...props} />);
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

  it('shows the transcript, its word count and the files written beside the video', () => {
    renderModal({
      download: single({ status: 'done', isSuccess: true, message: 'Download complete', filePath: '/a.mp4' }),
      transcript: { kind: 'text', text: 'one two three', transcripts: TRANSCRIPTS, outputPaths: ['/a.srt', '/a.txt'] },
    });
    expect(screen.getByText('3 words, saved beside the video as TXT and SRT')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save a copy/ })).toBeTruthy();
  });

  it('stays open while the transcript is made, offering only to stop it', () => {
    const { onStopTranscribing } = renderModal({
      download: single({ status: 'done', isSuccess: true, message: 'Download complete', filePath: '/a.mp4' }),
      isTranscribing: true,
      transcribePercent: 35,
    });
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Transcription progress' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stop transcribing' }));
    expect(onStopTranscribing).toHaveBeenCalled();
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
    expect(screen.getByText('Saved').nextElementSibling?.textContent).toBe('1');
    expect(screen.getByText('Failed').nextElementSibling?.textContent).toBe('1');
    expect(screen.getAllByText('Video C').length).toBe(2);
  });

  it('shows the item being transcribed, counts transcripts and marks the saved formats', () => {
    const created = createBulkDownload(items.map((item) => ({ ...item, shouldTranscribe: true })));
    const download = {
      ...created,
      items: created.items.map((item, index) => {
        if (index === 0) return { ...item, status: 'done' as const, isSuccess: true, transcriptPaths: ['/A.txt', '/A.srt'] };
        if (index === 1) return { ...item, status: 'transcribing' as const, percent: 20 };
        return item;
      }),
    };
    renderModal({ download });

    expect(screen.getByText('Now transcribing')).toBeTruthy();
    expect(screen.getByText('Transcribed').nextElementSibling?.textContent).toBe('1');
    expect(screen.getByRole('img', { name: 'Transcript saved as TXT and SRT' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel downloads' })).toBeTruthy();
  });

  it('offers Close instead of Cancel once every item is done', () => {
    const download = { ...createBulkDownload(items.slice(0, 1)), isFinished: true };
    renderModal({ download });
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: 'Cancel downloads' })).toBeNull();
  });
});
