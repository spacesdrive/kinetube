import { FolderOpen, SlidersHorizontal } from 'lucide-react';

import StatusBadge from '@/components/patterns/StatusBadge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import FileNameFields from './FileNameFields';
import { hasCustomNaming } from './fileNamePreview';
import OutputFolderField from './OutputFolderField';

import type { DownloadSettings } from '@/lib/settings';

export interface DownloadSettingsPanelProps {
  settings: DownloadSettings;
  onChange(settings: DownloadSettings): void;
}

// this session's overrides of the defaults saved in Settings, in a side panel so the link field stays first
export default function DownloadSettingsPanel({ settings, onChange }: DownloadSettingsPanelProps) {
  const isCustom = hasCustomNaming({ ...settings, outputDir: '' });
  const folderLabel = settings.outputDir.trim() || 'the default downloads folder';

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13px] text-ink-muted">
      <span className="flex min-w-0 items-center gap-1.5">
        <FolderOpen size={14} aria-hidden="true" className="flex-shrink-0 text-ink-faint" />
        <span className="truncate">Saving to <span className="font-medium text-ink">{folderLabel}</span></span>
      </span>
      {isCustom && <StatusBadge tone="accent">Custom file names</StatusBadge>}
      <Sheet>
        <SheetTrigger render={<Button type="button" variant="outline" size="sm" />}>
          <SlidersHorizontal /> Download options
        </SheetTrigger>
        <SheetContent className="w-full">
          <SheetHeader>
            <SheetTitle>Download options</SheetTitle>
            <SheetDescription>These apply until you close kinetube. Change the saved defaults in Settings.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-2">
            <OutputFolderField value={settings.outputDir} onChange={(outputDir) => onChange({ ...settings, outputDir })} />
            <FileNameFields settings={settings} onChange={onChange} />
          </div>
          <SheetFooter>
            <SheetClose render={<Button type="button" variant="inverse" className="w-full" />}>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
