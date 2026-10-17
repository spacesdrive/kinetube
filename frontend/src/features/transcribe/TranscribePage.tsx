import { AudioLines, Download, Square } from 'lucide-react';
import { useState } from 'react';

import DetailPanel from '@/components/patterns/DetailPanel';
import EmptyState from '@/components/patterns/EmptyState';
import HoldToConfirmButton from '@/components/patterns/HoldToConfirmButton';
import PageHeader from '@/components/patterns/PageHeader';
import SectionHeader from '@/components/patterns/SectionHeader';
import { Button } from '@/components/ui/button';
import { pluralize } from '@/lib/format';
import { loadSettings } from '@/lib/settings';
import FileSources from './FileSources';
import LanguageSelect from './LanguageSelect';
import ModelPicker from './ModelPicker';
import QueueItemCard from './QueueItemCard';
import { isWaiting } from './transcribeQueueState';
import { useTranscribeQueue } from './useTranscribeQueue';
import { useWhisperModels } from './useWhisperModels';
import { useWhisperSetup } from './useWhisperSetup';
import WhisperSetupAlert from './WhisperSetupAlert';

function startLabel(waitingCount: number): string {
  return waitingCount > 1 ? `Transcribe ${waitingCount} files` : 'Transcribe';
}

export default function TranscribePage() {
  const setup = useWhisperSetup();
  const whisperModels = useWhisperModels(setup.isInstalled === true);
  const queue = useTranscribeQueue();
  const [language, setLanguage] = useState(() => loadSettings().transcription.defaultLanguage);

  const waitingCount = queue.items.filter(isWaiting).length;
  const doneCount = queue.items.filter((item) => item.status === 'done').length;
  const canStart = setup.isInstalled === true && whisperModels.isSelectedReady && waitingCount > 0 && !queue.isRunning;

  const footer = (
    <div className="space-y-2">
      {queue.isRunning ? (
        <Button type="button" variant="destructive" size="lg" className="w-full" onClick={queue.stopAfterCurrent}><Square /> Stop after this file</Button>
      ) : (
        <Button type="button" size="lg" className="w-full" disabled={!canStart} onClick={() => void queue.start(whisperModels.selectedModelId, language)}><AudioLines /> {startLabel(waitingCount)}</Button>
      )}
      {!whisperModels.isSelectedReady && <p className="text-center text-xs text-ink-faint">Download the selected model first.</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Transcribe" description="Turn audio and video into text with Whisper. It all runs on this computer." />
      {setup.isInstalled === false && <WhisperSetupAlert setup={setup} />}
      {setup.isInstalled === true && (
        // a narrow window shows files, then settings, then the queue, so the start button is never far down
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_var(--panel-width)] lg:grid-rows-[auto_1fr]">
          <div className="lg:col-start-1 lg:row-start-1"><FileSources queue={queue} /></div>
          <DetailPanel title="Settings" description="Larger models are more accurate, but slower." footer={footer} className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <ModelPicker whisperModels={whisperModels} />
            <LanguageSelect value={language} onChange={setLanguage} />
          </DetailPanel>
          <section className="space-y-3 lg:col-start-1 lg:row-start-2">
            <SectionHeader
              title="Queue"
              description={queue.items.length > 0 ? `${pluralize(queue.items.length, 'file')}, ${doneCount} done` : undefined}
              actions={(
                <>
                  {doneCount > 1 && !queue.isRunning && <Button type="button" variant="outline" size="sm" onClick={queue.saveAll}><Download /> Save all</Button>}
                  {queue.items.length > 0 && !queue.isRunning && <HoldToConfirmButton label="Hold to clear" onConfirm={queue.clear} className="h-8 px-3 text-[13px]" />}
                </>
              )}
            />
            {queue.items.length === 0 ? (
              <div className="rounded-card bg-surface"><EmptyState title="No files yet" description="Add files above. Each one is transcribed in turn, and you can save the text when it's done." /></div>
            ) : (
              <ul className="space-y-2">
                {queue.items.map((item) => <QueueItemCard key={item.id} item={item} canRemove={!queue.isRunning} onRemove={queue.remove} />)}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
