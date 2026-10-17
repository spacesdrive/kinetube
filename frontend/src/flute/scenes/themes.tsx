import { Surface } from '@webprodigies/flute';

import DemoDownloadPage from '../demo/DemoDownloadPage';
import DemoShell from '../demo/DemoShell';
import { SHELL_HEIGHT, SHELL_WIDTH } from '../demo/frame';
import { CHANNEL_VIDEOS } from '../demo/fixtures/channelVideos';

const FOUND = { platform: 'youtube', media: CHANNEL_VIDEOS } as const;

// both pages share one origin in the middle of the frame; their transforms match the nodes in themes.scene.json
const STACKED = { position: 'absolute', left: (1600 - SHELL_WIDTH) / 2, top: (1000 - SHELL_HEIGHT) / 2, width: SHELL_WIDTH, height: SHELL_HEIGHT } as const;

// the same channel page in both themes, one behind the other
export default function ThemesScene() {
  return (
    <>
      <Surface id="light" style={STACKED} transform={{ x: -720, y: -40, z: -200 }}>
        <DemoShell page="youtube" context={CHANNEL_VIDEOS.name}>
          <DemoDownloadPage found={FOUND} />
        </DemoShell>
      </Surface>
      <Surface id="dark" style={STACKED} transform={{ x: 640, y: 40 }}>
        <DemoShell page="youtube" context={CHANNEL_VIDEOS.name} isDark>
          <DemoDownloadPage found={FOUND} />
        </DemoShell>
      </Surface>
    </>
  );
}
