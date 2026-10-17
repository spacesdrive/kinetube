export type YtdlpLine =
  | { kind: 'progress'; percent: number; speed: string; eta: string }
  | { kind: 'destination'; filePath: string }
  | { kind: 'alreadyDownloaded'; message: string }
  | { kind: 'postProcessing' }
  | { kind: 'info'; message: string }
  | { kind: 'other' };

// "[download]  45.2% of 1.46GiB at 3.56MiB/s ETA 06:41"
const PROGRESS_PATTERN = /^\[download\]\s+([\d.]+)%\s+of\s+~?[\d.]+\s*\S+\s+at\s+~?([\d.]+\s*\S+\/s)\s+ETA\s+(\S+)/;

// "[download] 100% of 10.00MiB in 00:00:03 at 2.95MiB/s" has no ETA, so only the percent is read
const PERCENT_PATTERN = /^\[download\]\s+([\d.]+)%/;

const DESTINATION_PATTERN = /^\[download\] Destination: (.+)/;

// the merge, the mp3 conversion and other FFmpeg steps that run after the download itself
const POST_PROCESSING_PREFIXES = ['[Merger]', '[ffmpeg]', '[ExtractAudio]'];

function readPercent(text: string | undefined): number {
  const percent = Number.parseFloat(text ?? '');
  return Number.isFinite(percent) ? percent : 0;
}

export function parseYtdlpLine(line: string): YtdlpLine {
  const progressMatch = line.match(PROGRESS_PATTERN);
  if (progressMatch) {
    return { kind: 'progress', percent: readPercent(progressMatch[1]), speed: progressMatch[2] ?? '', eta: progressMatch[3] ?? '' };
  }

  const destinationMatch = line.match(DESTINATION_PATTERN);
  if (destinationMatch?.[1]) return { kind: 'destination', filePath: destinationMatch[1] };

  if (line.startsWith('[download]') && line.includes('has already been downloaded')) {
    return { kind: 'alreadyDownloaded', message: line };
  }

  const percentMatch = line.match(PERCENT_PATTERN);
  if (percentMatch) return { kind: 'progress', percent: readPercent(percentMatch[1]), speed: '', eta: '' };

  if (POST_PROCESSING_PREFIXES.some((prefix) => line.startsWith(prefix))) return { kind: 'postProcessing' };
  if (line.startsWith('[')) return { kind: 'info', message: line };
  return { kind: 'other' };
}

// the last two lines worth reading: "ERROR: ..." lines, or plain text that is not a [module] log line
export function summarizeErrorOutput(stderr: string): string {
  return stderr
    .trim()
    .split('\n')
    .filter((line) => line.includes('ERROR') || (!line.startsWith('[') && line.trim()))
    .slice(-2)
    .join(' ')
    .trim();
}
