import { Surface } from '@webprodigies/flute';

import DemoDownloadPage from '../demo/DemoDownloadPage';
import DemoShell from '../demo/DemoShell';
import { SHELL_HEIGHT, SHELL_WIDTH } from '../demo/frame';
import { CHANNEL_STREAMS } from '../demo/fixtures/channelStreams';

export default function YouTubeChannelScene() {
  return (
    <Surface id="page" style={{ width: SHELL_WIDTH, height: SHELL_HEIGHT }}>
      <DemoShell page="youtube" context={CHANNEL_STREAMS.name} isDark>
        <DemoDownloadPage found={{ platform: 'youtube', media: CHANNEL_STREAMS }} />
      </DemoShell>
    </Surface>
  );
}
