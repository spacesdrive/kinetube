// real YouTube metadata read through the app's own API on 2026-10-17, so the scenes show what the app shows
import type { YouTubeChannel } from '@shared/youtube.ts';

export const CHANNEL_PLAYLISTS = {
  kind: 'channel',
  urlType: 'channel-playlists',
  tab: 'playlists',
  url: 'https://www.youtube.com/@NASA/playlists',
  channelPath: '@NASA',
  channelId: 'UCLA_DiR1FfKNvjuUpBHmylQ',
  name: 'NASA',
  channelUrl: 'https://www.youtube.com/channel/UCLA_DiR1FfKNvjuUpBHmylQ',
  avatarUrl: 'https://yt3.googleusercontent.com/eIf5fNPcIcj9ig-wZBeq4stFy1lgjWTW1nLT5dYlFkHZprZ03QBiMcbpwNMB6XSBjrSFGtAGQg=s900-c-k-c0x00ffffff-no-rj',
  videoCount: 0,
  entries: [],
  playlists: [
    {
      id: 'PLF98rxtslw6s',
      title: 'Nancy Grace Roman Space Telescope',
      url: 'https://www.youtube.com/playlist?list=PLF98rxtslw6s',
      thumbnailUrl: 'https://i.ytimg.com/vi/9wq3VHsL_bE/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLCC7609JJdE1ic8h5PLtaCFmDRDYg',
    },
    {
      id: 'PLB29CbKaE2OY',
      title: 'NASA Moon Base',
      url: 'https://www.youtube.com/playlist?list=PLB29CbKaE2OY',
      thumbnailUrl: 'https://i.ytimg.com/pl_c/PLB29CbKaE2OY/studio_square_thumbnail.jpg?sqp=CKTYztYG-oaymwEICIAKENAFSFqi85f_AwYIqMLO0wY=&rs=AOn4CLCaHAs9QdMZnSIvB-xnPLogftXTfw',
    },
    {
      id: 'PLb911ot23pTQ',
      title: '2026 Total Solar Eclipse',
      url: 'https://www.youtube.com/playlist?list=PLb911ot23pTQ',
      thumbnailUrl: 'https://i.ytimg.com/pl_c/PLb911ot23pTQ/studio_square_thumbnail.jpg?sqp=CIO5ztYG-oaymwEICIAKENAFSFqi85f_AwYIyoGk0wY=&rs=AOn4CLAP5Z7g_djLd0PE5k7bawQgAwtD5A',
    },
    {
      id: 'PL2aBZuCeDwlRaF6AIey7ulmW1X0SHI1mQ',
      title: 'Artemis III',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlRaF6AIey7ulmW1X0SHI1mQ',
      thumbnailUrl: 'https://i.ytimg.com/vi/yMoGiIeDH9s/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLDfsmBn0EzLglbGoa-Q9UCm9qS_kw',
    },
    {
      id: 'PL2aBZuCeDwlSZtPohs7riBBDIgl9D5ltA',
      title: 'Artemis II Astronauts',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlSZtPohs7riBBDIgl9D5ltA',
      thumbnailUrl: 'https://i.ytimg.com/vi/7xz9s8cVFE4/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLAve-rx2Knz3ddFvHSe-0zKEkPcwA',
    },
    {
      id: 'PL2aBZuCeDwlQvNtHhNJtarm9OewQwVntv',
      title: 'Artemis II Mission Coverage',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlQvNtHhNJtarm9OewQwVntv',
      thumbnailUrl: 'https://i.ytimg.com/vi/DYY4nnfxKbU/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLAi1OCwehE4YN4-jFbe-SlII4gyyw',
    },
    {
      id: 'PL2aBZuCeDwlTXR6kIe16j0h4lx--ZneRO',
      title: 'Europa Clipper',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlTXR6kIe16j0h4lx--ZneRO',
      thumbnailUrl: 'https://i.ytimg.com/vi/uUpEEU7pplg/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLB5oIiowEUNsPMnDXGxr5v_sj5E2Q',
    },
    {
      id: 'PL2aBZuCeDwlSlkI3MBOmbt-FZaAWSNbB2',
      title: 'NASA+ Series Trailers',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlSlkI3MBOmbt-FZaAWSNbB2',
      thumbnailUrl: 'https://i.ytimg.com/vi/5sTyFfO-wAI/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLDT0ops9tks12q9pn7qO5x1Ipd99Q',
    },
    {
      id: 'PL2aBZuCeDwlQoPqPmj1NR4S5JDcqMOspT',
      title: 'Artemis I: Path to the Pad',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlQoPqPmj1NR4S5JDcqMOspT',
      thumbnailUrl: 'https://i.ytimg.com/vi/EZkcmCX--ow/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLChwG3XrF-5rss_Pfeey26OLLcXtA',
    },
    {
      id: 'PL2aBZuCeDwlTW27zw5zOH0hKRoXVtK7Z7',
      title: 'Camera Views from NASA\'s Artemis I Mission to the Moon',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlTW27zw5zOH0hKRoXVtK7Z7',
      thumbnailUrl: 'https://i.ytimg.com/vi/ppxaKK9papQ/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLBwqxrjqOz14ryExk3FUcpGitJx2g',
    },
    {
      id: 'PL2aBZuCeDwlTmIkf6-R2QUhxhWkLzwCtM',
      title: 'NASA Explorers: Season 5',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlTmIkf6-R2QUhxhWkLzwCtM',
      thumbnailUrl: 'https://i.ytimg.com/vi/2eFHWuNuDSA/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLAxeB1dM8yDxEoWdiKOlhF033KJwg',
    },
    {
      id: 'PL2aBZuCeDwlSoxUrYsYWZr6NBTTKGir8U',
      title: 'NASA News Briefings',
      url: 'https://www.youtube.com/playlist?list=PL2aBZuCeDwlSoxUrYsYWZr6NBTTKGir8U',
      thumbnailUrl: 'https://i.ytimg.com/vi/4WALToxcMjo/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLB2hfpopRfowa6XGiD0U9ar9XiFvg',
    },
  ],
} satisfies YouTubeChannel;
