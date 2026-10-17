import { AudioLines, ClipboardPaste, Layers } from 'lucide-react';

import ChoiceCard from '@/components/patterns/ChoiceCard';

import type { Page } from '@/lib/pages';

export interface QuickActionsProps {
  onPasteLink(): void;
  onPageChange(page: Page): void;
}

export default function QuickActions({ onPasteLink, onPageChange }: QuickActionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <ChoiceCard icon={ClipboardPaste} title="Paste and fetch" description="Reads the link you just copied and fetches it." onClick={onPasteLink} />
      <ChoiceCard icon={Layers} title="Batch download" description="Paste many links, then pick what to keep." onClick={() => onPageChange('batch')} />
      <ChoiceCard icon={AudioLines} title="Transcribe a file" description="Turn audio or video into text with Whisper." onClick={() => onPageChange('transcribe')} />
    </div>
  );
}
