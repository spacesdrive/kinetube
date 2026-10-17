import { Surface } from '@webprodigies/flute';
import { useMemo, useRef } from 'react';

import DemoDownloadPage from '../demo/DemoDownloadPage';
import DemoShell from '../demo/DemoShell';
import { SHELL_HEIGHT, SHELL_WIDTH } from '../demo/frame';
import TimedChecks from '../demo/TimedChecks';
import { PLAYLIST } from '../demo/fixtures/playlist';

import type { TimedCheck } from '../demo/TimedChecks';

const CHECKS: TimedCheck[] = [
  { atMs: 700, index: 0 },
  { atMs: 1000, index: 1 },
  { atMs: 1300, index: 3 },
  { atMs: 1600, index: 4 },
  { atMs: 1900, index: 6 },
];

export default function YouTubePlaylistScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  // the page is built once; only TimedChecks follows the clock
  const page = useMemo(() => (
    <DemoShell page="youtube" context={PLAYLIST.title}>
      <DemoDownloadPage found={{ platform: 'youtube', media: PLAYLIST }} />
    </DemoShell>
  ), []);

  return (
    <Surface id="page" style={{ width: SHELL_WIDTH, height: SHELL_HEIGHT }}>
      <div ref={rootRef}>{page}</div>
      <TimedChecks rootRef={rootRef} checks={CHECKS} />
    </Surface>
  );
}
