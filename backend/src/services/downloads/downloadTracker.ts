import { finalFilePath, titleFromPath } from '../../managers/ytdlp/ytdlpFileNames.ts';

import type { DownloadEvents, DownloadPhase } from '@shared/downloads.ts';
import type { EventSink } from '../../lib/sse.ts';
import type { YtdlpLine } from '../../managers/ytdlp/ytdlpOutput.ts';

export type TrackerEvents = Omit<DownloadEvents, 'start' | 'warning' | 'paused' | 'done'>;

export interface DownloadTracker {
  handleLine(line: YtdlpLine): void;
  title(): string;
  filePath(): string;
}

const PHASE_LABELS: Record<DownloadPhase, string> = {
  video: 'Downloading video...',
  audio: 'Downloading audio...',
  merging: 'Merging video and audio...',
};

// "[download] /path/Title [id].mp4 has already been downloaded"
const ALREADY_DOWNLOADED_PATTERN = /^\[download\] (.+) has already been downloaded/;

// follows yt-dlp's output for one download: which file it writes, which phase it is in, and how far along
export function createDownloadTracker(isAudioOnly: boolean, send: EventSink<TrackerEvents>, onTitle: (title: string) => void): DownloadTracker {
  let phase: DownloadPhase = isAudioOnly ? 'audio' : 'video';
  let firstDestination = '';
  let title = '';
  let isMultiFile = false;

  function changePhase(nextPhase: DownloadPhase): void {
    if (phase === nextPhase) return;
    phase = nextPhase;
    const label = nextPhase === 'merging' && isAudioOnly ? 'Converting to MP3...' : PHASE_LABELS[nextPhase];
    send('phase', { phase, label, isMultiFile });
  }

  function recordDestination(filePath: string): void {
    if (firstDestination) {
      // a second file is the audio track of a video downloaded as two streams
      isMultiFile = true;
      changePhase('audio');
      return;
    }
    firstDestination = filePath;
    title = titleFromPath(filePath);
    onTitle(title);
    send('title', { title });
  }

  return {
    handleLine(line) {
      if (line.kind === 'progress') {
        send('progress', { percent: line.percent, speed: line.speed, eta: line.eta, title, phase, isMultiFile });
      } else if (line.kind === 'destination') {
        recordDestination(line.filePath);
      } else if (line.kind === 'alreadyDownloaded') {
        const existingPath = line.message.match(ALREADY_DOWNLOADED_PATTERN)?.[1];
        if (existingPath && !firstDestination) recordDestination(existingPath);
        send('log', { message: line.message, level: 'info' });
      } else if (line.kind === 'postProcessing') {
        changePhase('merging');
      } else if (line.kind === 'info') {
        send('log', { message: line.message, level: 'info' });
      }
    },
    title: () => title,
    filePath: () => (firstDestination ? finalFilePath(firstDestination, isMultiFile, isAudioOnly) : ''),
  };
}
