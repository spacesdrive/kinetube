import type { YtdlpMediaJson } from '../../src/platforms/ytdlpJson.ts';

// trimmed from real yt-dlp 2026.08.19 --flat-playlist --dump-single-json output; the private entry is how yt-dlp lists one

export const PLAYLIST_SAMPLE: YtdlpMediaJson = {
  id: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI',
  title: 'Popular Music Videos',
  availability: 'public',
  thumbnails: [
    { url: 'https://i.ytimg.com/vi/fOT0BUpITw8/hqdefault.jpg?sqp=small', height: 94, width: 168 },
    { url: 'https://i.ytimg.com/vi/fOT0BUpITw8/hqdefault.jpg?sqp=large', height: 188, width: 336 },
  ],
  view_count: 1045670879,
  playlist_count: 182,
  channel: 'Music',
  channel_id: 'UC-9-kyTW8ZkZNDHQJ6FgpwQ',
  uploader: 'Music',
  channel_url: 'https://www.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ',
  uploader_url: null,
  entries: [
    {
      title: 'BELLAKEO (Video Oficial) - Peso Pluma, Anitta',
      thumbnails: [{ url: 'https://i.ytimg.com/vi/fOT0BUpITw8/hqdefault.jpg?sqp=entry', height: 188, width: 336 }],
      duration: 235,
      view_count: 768000000,
      live_status: null,
      availability: null,
      ie_key: 'Youtube',
      id: 'fOT0BUpITw8',
      url: 'https://www.youtube.com/watch?v=fOT0BUpITw8',
    },
    {
      title: '[Private video]',
      thumbnails: [{ url: 'https://i.ytimg.com/img/no_thumbnail.jpg', height: 90, width: 120 }],
      duration: null,
      view_count: null,
      live_status: null,
      availability: null,
      ie_key: 'Youtube',
      id: 'aaaaaaaaaaa',
      url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
    },
  ],
};

export const CHANNEL_PLAYLISTS_SAMPLE: YtdlpMediaJson = {
  id: 'UC4QobU6STFB0P71PMvOGN5A',
  channel: 'jawed',
  channel_id: 'UC4QobU6STFB0P71PMvOGN5A',
  title: 'jawed - Playlists',
  thumbnails: [{ url: 'https://yt3.googleusercontent.com/avatar=s900-c-k-c0x00ffffff-no-rj', height: 900, width: 900 }],
  uploader: 'jawed',
  uploader_url: 'https://www.youtube.com/@jawed',
  playlist_count: 1,
  channel_url: 'https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A',
  entries: [
    {
      title: 'YouTube',
      thumbnails: [{ url: 'https://i.ytimg.com/vi/lVI_J1cbFb4/hqdefault.jpg?sqp=playlist', height: 270, width: 480 }],
      duration: null,
      view_count: null,
      live_status: null,
      availability: null,
      ie_key: 'YoutubeTab',
      id: 'PLuhl9TnQPDCnWIhy_KSbtFwXVQnNvgfSh',
      url: 'https://www.youtube.com/playlist?list=PLuhl9TnQPDCnWIhy_KSbtFwXVQnNvgfSh',
    },
  ],
};

export const CHANNEL_STREAMS_SAMPLE: YtdlpMediaJson = {
  id: 'UCLA_DiR1FfKNvjuUpBHmylQ',
  channel: 'NASA',
  channel_id: 'UCLA_DiR1FfKNvjuUpBHmylQ',
  title: 'NASA - Live',
  uploader: 'NASA',
  uploader_url: 'https://www.youtube.com/@NASA',
  playlist_count: 597,
  channel_url: 'https://www.youtube.com/channel/UCLA_DiR1FfKNvjuUpBHmylQ',
  entries: [
    {
      title: 'Artemis Acceleration (Oct. 23, 2026)',
      duration: null,
      live_status: 'is_upcoming',
      ie_key: 'Youtube',
      id: 'pAKqJxuxDgk',
      url: 'https://www.youtube.com/watch?v=pAKqJxuxDgk',
    },
    {
      title: 'Live Video from the International Space Station (Official NASA Stream)',
      duration: null,
      live_status: 'is_live',
      ie_key: 'Youtube',
      id: 'M3HKLzjvKPc',
      url: 'https://www.youtube.com/watch?v=M3HKLzjvKPc',
    },
    {
      title: "NASA's SpaceX Crew-12 Postflight News Conference (Oct. 15, 2026)",
      duration: 2396,
      view_count: 73000,
      live_status: 'was_live',
      ie_key: 'Youtube',
      id: 'ivng4U5xeYM',
      url: 'https://www.youtube.com/watch?v=ivng4U5xeYM',
    },
  ],
};
