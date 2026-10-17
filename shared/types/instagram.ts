import type { StreamDone } from './api.ts';

export interface InstagramFormat {
  height: number;
  label: string;
  ext: string;
  fileSize: number | null;
}

export interface InstagramPost {
  kind: 'post';
  urlType: 'post' | 'reel' | 'story';
  id: string;
  url: string;
  shortcode: string | null;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  durationText: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  uploader: string | null;
  uploadDate: string | null;
  formats: InstagramFormat[];
}

export interface ProfileEntry {
  id: string;
  shortcode: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number | null;
}

export interface InstagramProfile {
  kind: 'profile';
  urlType: 'profile' | 'profile-reels' | 'profile-tagged';
  url: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  postCount: number;
  // the helper stops after a fixed number of posts, so a large profile comes back cut short
  isTruncated: boolean;
  entries: ProfileEntry[];
}

export type InstagramMedia = InstagramPost | InstagramProfile;

export interface InstagramMediaEvents {
  profile: { username: string; name: string; postCount: number; avatarUrl: string | null };
  progress: { fetchedCount: number; totalCount: number };
  done: StreamDone<{ media: InstagramMedia }>;
}

export interface InstagramAccount {
  username: string;
  addedAt: string;
  hasSession: boolean;
}

export interface CreateInstagramAccountRequest {
  username: string;
  password: string;
}

export interface VerifyInstagramLoginRequest {
  code: string;
}

// 201 when the login finished, 202 when Instagram asked for a two-factor code first
export type InstagramLoginResult =
  | { status: 'loggedIn'; account: InstagramAccount }
  | { status: 'twoFactorRequired'; username: string };
