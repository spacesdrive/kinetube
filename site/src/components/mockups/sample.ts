// real YouTube metadata for NASA's public videos, the same the README recordings show
// (frontend/src/flute/demo/fixtures), with their thumbnails saved under public/media/thumbs

export const VIDEO = {
  url: 'https://www.youtube.com/watch?v=IwZVXmQdX1E',
  title: 'NASA Moon Base: The First Six Months',
  channel: 'NASA',
  length: '1:07',
  views: '523K views',
  date: '2026-09-08',
  thumbnail: '/media/thumbs/nasa-moon-base.webp',
};

// a NASA Short, for the pictures that need a 9:16 frame like a reel
export const SHORT_THUMBNAIL = '/media/thumbs/nasa-moon-base-short.webp';

export const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlQvNtHhNJtarm9OewQwVntv';

export interface SampleVideo {
  id: string;
  title: string;
}

export const NASA_VIDEOS: SampleVideo[] = [
  { id: 'IwZVXmQdX1E', title: 'NASA Moon Base: The First Six Months' },
  { id: '5b3n-u_0QAI', title: 'Planetary Defenders: This Is Not an Exercise' },
  { id: 'ErAqN6gXqZQ', title: "NASA's SpaceX Crew-13 Mission" },
  { id: '90Kgw_SvK4w', title: 'What It Takes' },
  { id: 'jHKf1eHp3eQ', title: 'Artemis III: Our Next Step Back to the Moon' },
  { id: 'MVt2139voxk', title: 'For Earth, With Love: Artemis II' },
  { id: '_oXt3-YDih4', title: "Artemis Origins: Humanity's Return to the Moon" },
  { id: '6o3m9Bw67Os', title: 'Nancy Grace Roman Space Telescope Launches' },
  { id: '8NOLpgadWXc', title: 'Artemis II Astronauts Receive the Congressional Space Medal of Honor' },
];

export function thumbnailOf(id: string): string {
  return `/media/thumbs/${id}.webp`;
}
