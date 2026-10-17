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
  // a watch link with list= also names its playlist, so the page can offer to load the whole list
  playlistUrl: string | null;
  videoFormats: VideoFormat[];
  audioFormats: AudioFormat[];
}

// an upcoming or still-running stream has no file to download yet; private and deleted videos never will
export type VideoEntryStatus = 'available' | 'upcoming' | 'live' | 'unavailable';

export interface VideoEntry {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  duration: number | null;
  durationText: string | null;
  viewCount: number | null;
  uploadDate: string | null;
  status: VideoEntryStatus;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

export type ChannelTab = 'videos' | 'shorts' | 'streams' | 'playlists';

export interface YouTubeChannel {
  kind: 'channel';
  urlType: 'channel' | 'channel-videos' | 'channel-shorts' | 'channel-streams' | 'channel-playlists';
  tab: ChannelTab;
  url: string;
  channelPath: string;
  channelId: string;
  name: string;
  channelUrl: string;
  avatarUrl: string | null;
  // entries holds the videos of the videos, shorts and streams tabs; playlists holds the playlists tab
  videoCount: number;
  entries: VideoEntry[];
  playlists: PlaylistEntry[];
}

export interface YouTubePlaylist {
  kind: 'playlist';
  urlType: 'playlist';
  id: string;
  url: string;
  title: string;
  owner: string | null;
  ownerUrl: string | null;
  thumbnailUrl: string | null;
  videoCount: number;
  entries: VideoEntry[];
}

export type YouTubeMedia = YouTubeVideo | YouTubeChannel | YouTubePlaylist;
