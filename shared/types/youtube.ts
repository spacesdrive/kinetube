export interface VideoFormat {
  formatId: string;
  height: number;
  fps: number;
  ext: string;
  fileSize: number | null;
  videoCodec: string;
  label: string;
  needsMerge: boolean;
}

export interface AudioFormat {
  formatId: string;
  bitrate: number;
  ext: string;
  fileSize: number | null;
  audioCodec: string;
  label: string;
}

export interface YouTubeVideo {
  kind: 'video';
  urlType: 'video' | 'shorts';
  id: string;
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  duration: number | null;
  durationText: string | null;
  viewCount: number | null;
  likeCount: number | null;
  uploader: string | null;
  uploadDate: string | null;
  videoFormats: VideoFormat[];
  audioFormats: AudioFormat[];
}

export interface ChannelEntry {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  duration: number | null;
  durationText: string | null;
  viewCount: number | null;
  uploadDate: string | null;
}

export interface YouTubeChannel {
  kind: 'channel';
  urlType: 'channel' | 'channel-videos' | 'channel-shorts';
  url: string;
  channelPath: string;
  channelId: string;
  name: string;
  channelUrl: string;
  avatarUrl: string | null;
  videoCount: number;
  entries: ChannelEntry[];
}

export type YouTubeMedia = YouTubeVideo | YouTubeChannel;
