import { Surface } from '@webprodigies/flute';

import DemoDownloadPage from '../demo/DemoDownloadPage';
import DemoShell from '../demo/DemoShell';
import { SHELL_HEIGHT, SHELL_WIDTH } from '../demo/frame';
import { VIDEO } from '../demo/fixtures/video';

export default function YouTubeVideoScene() {
  return (
    <Surface id="page" style={{ width: SHELL_WIDTH, height: SHELL_HEIGHT }}>
      <DemoShell page="youtube" context="Video" isDark>
        <DemoDownloadPage found={{ platform: 'youtube', media: VIDEO }} />
      </DemoShell>
    </Surface>
  );
}
