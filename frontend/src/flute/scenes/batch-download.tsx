import { Surface } from '@webprodigies/flute';

import BatchPage from '@/features/batch/BatchPage';
import DemoShell from '../demo/DemoShell';
import { BATCH } from '../demo/fixtures/batch';
import { SHELL_HEIGHT, SHELL_WIDTH } from '../demo/frame';
import { ignore } from '../demo/ignore';

export default function BatchDownloadScene() {
  return (
    <Surface id="page" style={{ width: SHELL_WIDTH, height: SHELL_HEIGHT }}>
      <DemoShell page="batch">
        <BatchPage batch={BATCH} defaultQuality="1080p" onBulkDownload={ignore} />
      </DemoShell>
    </Surface>
  );
}
