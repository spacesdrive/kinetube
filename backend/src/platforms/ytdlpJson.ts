// the fields of yt-dlp's -J output that KineTube reads; yt-dlp sends many more

export interface YtdlpFormatJson {
  format_id?: string;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  height?: number | null;
  fps?: number | null;
  abr?: number | null;
  tbr?: number | null;
  filesize?: number | null;
  filesize_approx?: number | null;
}

export interface YtdlpThumbnailJson {
  url?: string;
  width?: number;
  height?: number;
}

export interface YtdlpEntryJson {
  id?: string;
  title?: string;
  url?: string;
  duration?: number | null;
  duration_string?: string | null;
  view_count?: number | null;
  upload_date?: string | null;
  thumbnails?: YtdlpThumbnailJson[];
}

export interface YtdlpMediaJson extends YtdlpEntryJson {
  description?: string | null;
  thumbnail?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  uploader?: string | null;
  channel?: string | null;
  channel_id?: string | null;
  channel_url?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: YtdlpFormatJson[];
  entries?: (YtdlpEntryJson | null)[];
}

// yt-dlp's JSON is trusted to be an object; missing fields are handled where they are read
export function parseYtdlpJson(stdout: string): YtdlpMediaJson | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as YtdlpMediaJson;
  } catch {
    return null;
  }
}

export function fileSizeOf(format: YtdlpFormatJson): number | null {
  return format.filesize || format.filesize_approx || null;
}
