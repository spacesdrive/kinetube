import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import FileNameFields from './FileNameFields';
import { hasCustomNaming } from './fileNamePreview';
import OutputFolderField from './OutputFolderField';

import type { DownloadSettings } from '@/lib/settings';

export interface DownloadSettingsPanelProps {
  settings: DownloadSettings;
  onChange(settings: DownloadSettings): void;
}

// per-session overrides of the defaults saved in Settings, folded away under the link field
export default function DownloadSettingsPanel({ settings, onChange }: DownloadSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isCustom = hasCustomNaming(settings);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mx-auto w-full max-w-3xl">
      <CollapsibleTrigger
        className={cn(
          'flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-muted',
          isCustom ? 'font-medium text-blue-600' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Settings size={14} />
        <span>Download settings</span>
        {isCustom && <Badge variant="secondary" className="bg-blue-100 px-1.5 py-0 text-[10px] text-blue-700">Custom</Badge>}
        {isOpen ? <ChevronUp size={13} className="ml-0.5" /> : <ChevronDown size={13} className="ml-0.5" />}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
          <OutputFolderField value={settings.outputDir} onChange={(outputDir) => onChange({ ...settings, outputDir })} />
          <FileNameFields settings={settings} onChange={onChange} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
