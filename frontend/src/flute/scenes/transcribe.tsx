import { Surface } from '@webprodigies/flute';

import TranscribePage from '@/features/transcribe/TranscribePage';
import DemoShell from '../demo/DemoShell';
import { SHELL_HEIGHT, SHELL_WIDTH } from '../demo/frame';

// the live page: Whisper's install state and the models come from the running backend
export default function TranscribeScene() {
  return (
    <Surface id="page" style={{ width: SHELL_WIDTH, height: SHELL_HEIGHT }}>
      <DemoShell page="transcribe" isDark>
        <TranscribePage />
      </DemoShell>
    </Surface>
  );
}
