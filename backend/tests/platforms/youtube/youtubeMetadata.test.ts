import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { pickChannelAvatar } from '../../../src/platforms/youtube/channelAvatar.ts';
import { buildAudioFormats, buildVideoFormats } from '../../../src/platforms/youtube/youtubeFormats.ts';
import { mapYouTubeChannel, mapYouTubeVideo } from '../../../src/platforms/youtube/youtubeMetadata.ts';

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
    const video = mapYouTubeVideo({ id: 'dQw4w9WgXcQ' }, { urlType: 'video', videoId: 'dQw4w9WgXcQ', cleanUrl: 'https://youtu.be/x' });
    assert.equal(video.title, 'Untitled');
    assert.equal(video.url, 'https://youtu.be/x');
    assert.deepEqual(video.videoFormats, []);
  });

  test('a long description is cut to a 300 character preview', () => {
    const video = mapYouTubeVideo({ description: 'a'.repeat(500) }, { urlType: 'video', videoId: 'x', cleanUrl: 'u' });
    assert.equal(video.description.length, 300);
  });

  test('channel entries without an id are dropped and the rest get a watch link and thumbnail', () => {
    const channel = mapYouTubeChannel(
      { channel: 'Some Channel', entries: [null, { title: 'no id' }, { id: 'abc' }] },
      { urlType: 'channel', channelPath: '@some', cleanUrl: 'https://www.youtube.com/@some/videos' },
    );
    assert.equal(channel.videoCount, 1);
    assert.equal(channel.name, 'Some Channel');
    assert.equal(channel.entries[0]?.url, 'https://www.youtube.com/watch?v=abc');
    assert.equal(channel.entries[0]?.thumbnailUrl, 'https://i.ytimg.com/vi/abc/hqdefault.jpg');
  });
});
