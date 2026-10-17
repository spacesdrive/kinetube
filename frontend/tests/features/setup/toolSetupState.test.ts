import { describe, expect, it } from 'vitest';

import { applyToolEvent, isActivePhase, WAITING_TOOL } from '@/features/setup/toolSetupState';

describe('applyToolEvent', () => {
  it('follows the phases and the download progress of one tool', () => {
    let state = applyToolEvent(WAITING_TOOL, 'phase', { toolId: 'ffmpeg', phase: 'downloading', message: 'Downloading FFmpeg...', isSkipped: false });
    expect(isActivePhase(state.phase)).toBe(true);

    state = applyToolEvent(state, 'progress', { toolId: 'ffmpeg', downloadedBytes: 50, totalBytes: 100, percent: 50, bytesPerSecond: 10 });
    expect(state.percent).toBe(50);
  });

  it('an already installed tool goes straight to done at 100 percent', () => {
    const state = applyToolEvent(WAITING_TOOL, 'phase', { toolId: 'ytdlp', phase: 'done', message: 'yt-dlp is already installed', isSkipped: true });
    expect(state).toMatchObject({ phase: 'done', percent: 100 });
  });

  it('a failed done shows its message as an error', () => {
    const state = applyToolEvent(WAITING_TOOL, 'done', { success: false, code: 'CONFLICT', message: 'yt-dlp is already being set up.' });
    expect(state).toMatchObject({ phase: 'error', message: 'yt-dlp is already being set up.' });
  });
});
