import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createToolService } from '../../src/services/toolService.ts';
import { createFakeManagers } from '../fixtures/fakeManagers.ts';

import type { ToolInstallEvents } from '@shared/tools.ts';
import type { StreamEvent } from '../../src/lib/sse.ts';

function collect() {
  const events: StreamEvent<ToolInstallEvents>[] = [];
  return { events, send: (...event: StreamEvent<ToolInstallEvents>) => events.push(event), signal: new AbortController().signal };
}

describe('toolService', () => {
  test('a second install of the same tool while one runs is refused, and allowed again after', async () => {
    const service = createToolService(createFakeManagers());
    const job = service.install('ytdlp');
    assert.throws(() => service.install('ytdlp'), { name: 'ConflictError' });

    const { events, send, signal } = collect();
    await job(send, signal);
    assert.equal(events.at(-1)?.[0], 'done');
    assert.doesNotThrow(() => service.install('ytdlp'));
  });

  test('a failed install sends an error phase and a failed done that says what to do', async () => {
    const managers = createFakeManagers();
    managers.ffmpeg.install = async () => {
      throw new Error('HTTP 503 for https://example.com');
    };
    const { events, send, signal } = collect();

    await createToolService(managers).install('ffmpeg')(send, signal);

    const phaseEvent = events.find(([event]) => event === 'phase');
    assert.equal(phaseEvent && 'phase' in phaseEvent[1] ? phaseEvent[1].phase : null, 'error');
    assert.deepEqual(events.at(-1), ['done', { success: false, code: 'UPSTREAM_FAILED', message: "Couldn't install FFmpeg. HTTP 503 for https://example.com" }]);
  });

  test('only yt-dlp can be updated in place', () => {
    assert.throws(() => createToolService(createFakeManagers()).update('ffmpeg'), { name: 'ValidationError' });
  });

  test('the latest release check compares the installed version with GitHub', async () => {
    const release = await createToolService(createFakeManagers()).latestYtdlpRelease();
    assert.equal(release.isUpdateAvailable, true);
    assert.equal(release.releaseUrl, 'https://github.com/yt-dlp/yt-dlp/releases/tag/2026.09.01');
  });

  test('an unreachable GitHub is reported as an upstream failure, not as up to date', async () => {
    const managers = createFakeManagers();
    managers.ytdlp.fetchLatestVersion = async () => null;
    await assert.rejects(createToolService(managers).latestYtdlpRelease(), { name: 'UpstreamError' });
  });

  test('instaloader reports Python as the missing requirement when Python is absent', async () => {
    const managers = createFakeManagers();
    managers.instaloader.checkSetup = async () => ({ pythonCommand: null, hasInstaloader: false });
    const tool = await createToolService(managers).get('instaloader');
    assert.equal(tool.isInstalled, false);
    assert.equal(tool.missingRequirement, 'python');
  });
});
