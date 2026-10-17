import { parseMediaQuery } from '../validators/mediaValidators.ts';
import { dataResponse, sendStream } from './http.ts';

import type { DataResponse } from '@shared/api.ts';
import type { InstagramMedia } from '@shared/instagram.ts';
import type { YouTubeMedia } from '@shared/youtube.ts';
import type { Logger } from '../lib/logger.ts';
import type { InstagramMediaService } from '../services/instagramMediaService.ts';
import type { YouTubeMediaService } from '../services/youtubeMediaService.ts';
import type { Handler } from './http.ts';

export interface MediaController {
  getYouTubeMedia: Handler;
  getInstagramMedia: Handler;
}

export function createMediaController(youtube: YouTubeMediaService, instagram: InstagramMediaService, logger: Logger): MediaController {
  return {
    async getYouTubeMedia(req, res) {
      const { url } = parseMediaQuery(req.query);
      const media = await youtube.get(url);
      res.json(dataResponse(media) satisfies DataResponse<YouTubeMedia>);
    },

    // the same resource in two representations: JSON, or a progress stream while a profile is read
    async getInstagramMedia(req, res) {
      const { url, account } = parseMediaQuery(req.query);
      if (req.accepts(['application/json', 'text/event-stream']) === 'text/event-stream') {
        await sendStream(req, res, logger, instagram.stream(url, account));
        return;
      }
      const media = await instagram.get(url, account);
      res.json(dataResponse(media) satisfies DataResponse<InstagramMedia>);
    },
  };
}
