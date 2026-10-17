import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { pickChannelAvatar } from '../../../src/platforms/youtube/channelAvatar.ts';
import { buildAudioFormats, buildVideoFormats } from '../../../src/platforms/youtube/youtubeFormats.ts';
import { mapYouTubeChannel, mapYouTubeMedia, mapYouTubePlaylist, mapYouTubeVideo } from '../../../src/platforms/youtube/youtubeMetadata.ts';
import { CHANNEL_PLAYLISTS_SAMPLE, CHANNEL_STREAMS_SAMPLE, PLAYLIST_SAMPLE } from '../../fixtures/youtubeSamples.ts';

const LIST_ID = 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';
const PLAYLIST_URL = { urlType: 'playlist', listId: LIST_ID, cleanUrl: `https://www.youtube.com/playlist?list=${LIST_ID}` } as const;

describe('buildVideoFormats and buildAudioFormats', () => {
  const formats = [
    { format_id: '137', vcodec: 'avc1', acodec: 'none', height: 1080, fps: 30, ext: 'mp4', filesize: 100 },
    { format_id: '299', vcodec: 'avc1', acodec: 'none', height: 1080, fps: 60, ext: 'mp4' },
    { format_id: '303', vcodec: 'vp9', acodec: 'none', height: 1440, fps: 60, ext: 'webm', filesize_approx: 300 },
    { format_id: '18', vcodec: 'avc1', acodec: 'mp4a', height: 360, ext: 'mp4' },
    { format_id: '140', vcodec: 'none', acodec: 'mp4a', abr: 129.5, ext: 'm4a' },
    { format_id: '251', vcodec: 'none', acodec: 'opus', abr: 160, ext: 'webm' },
  ];

  test('each height is listed once, tallest first, with the frame rate shown from 50 fps', () => {
    const videoFormats = buildVideoFormats(formats);
    assert.deepEqual(videoFormats.map((format) => format.label), ['1440p60', '1080p', '360p']);
    assert.equal(videoFormats[0]?.fileSize, 300);
  });

  test('a video-only stream needs a merge and a combined one does not', () => {
    const videoFormats = buildVideoFormats(formats);
    assert.equal(videoFormats.find((format) => format.height === 1080)?.needsMerge, true);
    assert.equal(videoFormats.find((format) => format.height === 360)?.needsMerge, false);
  });

  test('audio-only streams are listed by rounded bitrate, highest first', () => {
    assert.deepEqual(buildAudioFormats(formats).map((format) => format.label), ['160kbps WEBM', '130kbps M4A']);
  });
});

describe('pickChannelAvatar', () => {
  test('the wide banner is skipped and the largest square avatar wins', () => {
    const thumbnails = [
      { url: 'https://yt3.googleusercontent.com/banner=fcrop64', width: 2560, height: 424 },
      { url: 'https://yt3.ggpht.com/avatar=s88', width: 88, height: 88 },
      { url: 'https://yt3.ggpht.com/avatar=s900' },
    ];
    assert.equal(pickChannelAvatar(thumbnails), 'https://yt3.ggpht.com/avatar=s900');
  });

  test('no thumbnails means no avatar', () => {
    assert.equal(pickChannelAvatar([]), null);
    assert.equal(pickChannelAvatar(undefined), null);
  });
});

describe('mapYouTubeVideo and mapYouTubeChannel', () => {
  test('a video keeps its clean link and gets safe defaults for missing fields', () => {
    const video = mapYouTubeVideo({ id: 'dQw4w9WgXcQ' }, { urlType: 'video', videoId: 'dQw4w9WgXcQ', cleanUrl: 'https://youtu.be/x', playlistUrl: null });
    assert.equal(video.title, 'Untitled');
    assert.equal(video.url, 'https://youtu.be/x');
    assert.equal(video.playlistUrl, null);
    assert.deepEqual(video.videoFormats, []);
  });

  test('a long description is cut to a 300 character preview', () => {
    const video = mapYouTubeVideo({ description: 'a'.repeat(500) }, { urlType: 'video', videoId: 'x', cleanUrl: 'u', playlistUrl: null });
    assert.equal(video.description.length, 300);
  });

  test('a video opened from a playlist names that playlist', () => {
    const video = mapYouTubeVideo({}, { urlType: 'video', videoId: 'dQw4w9WgXcQ', cleanUrl: 'u', playlistUrl: PLAYLIST_URL.cleanUrl });
    assert.equal(video.playlistUrl, PLAYLIST_URL.cleanUrl);
  });

  test('channel entries without an id are dropped and the rest get a watch link and thumbnail', () => {
    const channel = mapYouTubeChannel(
      { channel: 'Some Channel', entries: [null, { title: 'no id' }, { id: 'abc' }] },
      { urlType: 'channel', channelPath: '@some', tab: 'videos', cleanUrl: 'https://www.youtube.com/@some/videos' },
    );
    assert.equal(channel.videoCount, 1);
    assert.equal(channel.name, 'Some Channel');
    assert.equal(channel.tab, 'videos');
    assert.equal(channel.entries[0]?.url, 'https://www.youtube.com/watch?v=abc');
    assert.equal(channel.entries[0]?.thumbnailUrl, 'https://i.ytimg.com/vi/abc/hqdefault.jpg');
    assert.equal(channel.entries[0]?.status, 'available');
    assert.deepEqual(channel.playlists, []);
  });
});

describe('mapYouTubeChannel tabs', () => {
  test('the playlists tab lists playlists and no videos', () => {
    const channel = mapYouTubeChannel(CHANNEL_PLAYLISTS_SAMPLE, {
      urlType: 'channel-playlists',
      channelPath: '@jawed',
      tab: 'playlists',
      cleanUrl: 'https://www.youtube.com/@jawed/playlists',
    });
    assert.equal(channel.tab, 'playlists');
    assert.equal(channel.name, 'jawed');
    assert.deepEqual(channel.entries, []);
    assert.equal(channel.videoCount, 0);
    assert.deepEqual(channel.playlists, [
      {
        id: 'PLuhl9TnQPDCnWIhy_KSbtFwXVQnNvgfSh',
        title: 'YouTube',
        url: 'https://www.youtube.com/playlist?list=PLuhl9TnQPDCnWIhy_KSbtFwXVQnNvgfSh',
        thumbnailUrl: 'https://i.ytimg.com/vi/lVI_J1cbFb4/hqdefault.jpg?sqp=playlist',
      },
    ]);
  });

  test('the streams tab marks upcoming and running streams and keeps finished ones available', () => {
    const channel = mapYouTubeChannel(CHANNEL_STREAMS_SAMPLE, {
      urlType: 'channel-streams',
      channelPath: '@NASA',
      tab: 'streams',
      cleanUrl: 'https://www.youtube.com/@NASA/streams',
    });
    assert.equal(channel.tab, 'streams');
    assert.deepEqual(
      channel.entries.map((entry) => entry.status),
      ['upcoming', 'live', 'available'],
    );
    assert.equal(channel.videoCount, 3);
    assert.deepEqual(channel.playlists, []);
  });
});

describe('mapYouTubePlaylist', () => {
  test("a playlist keeps its title, owner, largest thumbnail and YouTube's own video count", () => {
    const playlist = mapYouTubePlaylist(PLAYLIST_SAMPLE, PLAYLIST_URL);
    assert.equal(playlist.kind, 'playlist');
    assert.equal(playlist.id, LIST_ID);
    assert.equal(playlist.url, PLAYLIST_URL.cleanUrl);
    assert.equal(playlist.title, 'Popular Music Videos');
    assert.equal(playlist.owner, 'Music');
    assert.equal(playlist.ownerUrl, 'https://www.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ');
    assert.equal(playlist.thumbnailUrl, 'https://i.ytimg.com/vi/fOT0BUpITw8/hqdefault.jpg?sqp=large');
    assert.equal(playlist.videoCount, 182);
  });

  test('each entry is a downloadable watch link and a private one is marked unavailable', () => {
    const playlist = mapYouTubePlaylist(PLAYLIST_SAMPLE, PLAYLIST_URL);
    assert.deepEqual(
      playlist.entries.map((entry) => [entry.url, entry.status]),
      [
        ['https://www.youtube.com/watch?v=fOT0BUpITw8', 'available'],
        ['https://www.youtube.com/watch?v=aaaaaaaaaaa', 'unavailable'],
      ],
    );
    assert.equal(playlist.entries[0]?.duration, 235);
  });

  test('a playlist with no title, owner, thumbnail or count gets safe defaults', () => {
    const playlist = mapYouTubePlaylist({ entries: [{ id: 'abcdefghijk' }] }, PLAYLIST_URL);
    assert.equal(playlist.id, LIST_ID);
    assert.equal(playlist.title, 'Untitled playlist');
    assert.equal(playlist.owner, null);
    assert.equal(playlist.ownerUrl, null);
    assert.equal(playlist.thumbnailUrl, null);
    assert.equal(playlist.videoCount, 1);
  });
});

describe('mapYouTubeMedia', () => {
  test('each kind of link is mapped to its own kind of media', () => {
    assert.equal(mapYouTubeMedia(PLAYLIST_SAMPLE, PLAYLIST_URL).kind, 'playlist');
    const channelUrl = { urlType: 'channel', channelPath: '@x', tab: 'videos', cleanUrl: 'https://www.youtube.com/@x/videos' } as const;
    assert.equal(mapYouTubeMedia({}, channelUrl).kind, 'channel');
    const videoUrl = { urlType: 'video', videoId: 'dQw4w9WgXcQ', cleanUrl: 'u', playlistUrl: null } as const;
    assert.equal(mapYouTubeMedia({}, videoUrl).kind, 'video');
  });
});
