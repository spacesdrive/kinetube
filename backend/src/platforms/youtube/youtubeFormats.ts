import { fileSizeOf } from '../ytdlpJson.ts';

import type { AudioFormat, VideoFormat } from '@shared/youtube.ts';
import type { YtdlpFormatJson } from '../ytdlpJson.ts';

const hasVideo = (format: YtdlpFormatJson): boolean => Boolean(format.vcodec && format.vcodec !== 'none');
const hasAudio = (format: YtdlpFormatJson): boolean => Boolean(format.acodec && format.acodec !== 'none');

// 60 fps and above is worth showing in the label ("1080p60"); 24 to 30 fps is the default
const HIGH_FRAME_RATE = 50;

// one option per height, best first; the first format yt-dlp lists for a height wins
export function buildVideoFormats(formats: YtdlpFormatJson[]): VideoFormat[] {
  const seenHeights = new Set<number>();
  const videoFormats: VideoFormat[] = [];

  for (const format of formats) {
    const height = format.height ?? 0;
    if (!hasVideo(format) || height <= 0 || seenHeights.has(height)) continue;
    seenHeights.add(height);

    const fps = format.fps || 30;
    videoFormats.push({
      formatId: format.format_id ?? '',
      height,
      fps,
      ext: format.ext ?? '',
      fileSize: fileSizeOf(format),
      videoCodec: format.vcodec ?? '',
      label: `${height}p${fps >= HIGH_FRAME_RATE ? fps : ''}`,
      needsMerge: !hasAudio(format),
    });
  }
  return videoFormats.sort((first, second) => second.height - first.height);
}

// one option per bitrate for audio-only streams, best first
export function buildAudioFormats(formats: YtdlpFormatJson[]): AudioFormat[] {
  const seenBitrates = new Set<number>();
  const audioFormats: AudioFormat[] = [];

  for (const format of formats) {
    const bitrate = Math.round(format.abr || format.tbr || 0);
    if (!hasAudio(format) || hasVideo(format) || bitrate <= 0 || seenBitrates.has(bitrate)) continue;
    seenBitrates.add(bitrate);

    const ext = format.ext ?? '';
    audioFormats.push({
      formatId: format.format_id ?? '',
      bitrate,
      ext,
      fileSize: fileSizeOf(format),
      audioCodec: format.acodec ?? '',
      label: `${bitrate}kbps ${ext.toUpperCase()}`,
    });
  }
  return audioFormats.sort((first, second) => second.bitrate - first.bitrate);
}
