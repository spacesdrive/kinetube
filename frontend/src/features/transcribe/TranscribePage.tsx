import { Download, FileText, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { loadSettings } from '@/lib/settings';
import { isWaiting } from './transcribeQueueState';
import FileSources from './FileSources';
import ModelPicker from './ModelPicker';
import QueueItemCard from './QueueItemCard';
import { useTranscribeQueue } from './useTranscribeQueue';
import { useWhisperModels } from './useWhisperModels';
import { useWhisperSetup } from './useWhisperSetup';
import WhisperSetupAlert from './WhisperSetupAlert';

function startLabel(waitingCount: number): string {
  return waitingCount > 1 ? `Transcribe all (${waitingCount} files)` : 'Transcribe';
}

export default function TranscribePage() {
  const setup = useWhisperSetup();
  const whisperModels = useWhisperModels(setup.isInstalled === true);
  const queue = useTranscribeQueue();
  const [language, setLanguage] = useState(() => loadSettings().transcription.defaultLanguage);

  const waitingCount = queue.items.filter(isWaiting).length;
  const doneCount = queue.items.filter((item) => item.status === 'done').length;
  const canStart = setup.isInstalled === true && whisperModels.isSelectedReady && waitingCount > 0 && !queue.isRunning;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg"><FileText size={26} className="text-white" /></div>
        <h1 className="text-3xl font-extrabold tracking-tight">Transcribe</h1>
        <p className="mt-2 text-muted-foreground">Turn audio and video into text with Whisper, entirely on this computer</p>
      </div>

      {setup.isInstalled === false && <WhisperSetupAlert setup={setup} />}
      {setup.isInstalled === true && (
        <div className="space-y-5">
          <ModelPicker whisperModels={whisperModels} />
          <FileSources queue={queue} language={language} onLanguageChange={setLanguage} />
          {queue.items.length > 0 && (
            <div className="space-y-2">
              {queue.items.map((item) => <QueueItemCard key={item.id} item={item} canRemove={!queue.isRunning} onRemove={queue.remove} />)}
            </div>
          )}
          <div className="flex items-center gap-3">
            {queue.isRunning ? (
              <Button type="button" variant="destructive" className="h-12 flex-1 text-base" onClick={queue.stopAfterCurrent}><X size={18} className="mr-2" /> Stop after this file</Button>
            ) : (
              <Button
                type="button"
                disabled={!canStart}
                className="h-12 flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-base hover:from-purple-700 hover:to-blue-700"
                onClick={() => void queue.start(whisperModels.selectedModelId, language)}
              >
                <FileText size={18} className="mr-2" />
                {startLabel(waitingCount)}
              </Button>
            )}
            {doneCount > 1 && !queue.isRunning && (
              <Button type="button" className="h-12 px-5 text-base" onClick={queue.saveAll} title={`Save ${doneCount} transcripts`}><Download size={18} className="mr-2" /> Save all</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
