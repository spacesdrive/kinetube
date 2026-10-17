import { ChevronDown, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TRANSCRIPT_FORMAT_LABELS, TRANSCRIPT_FORMATS } from '@/lib/transcriptFormats';

import type { ComponentProps } from 'react';
import type { TranscriptFormat } from '@shared/transcriptions.ts';

export interface SaveTranscriptMenuProps {
  label: string;
  onSave(format: TranscriptFormat): void;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
}

// a Save button that asks which file to save: plain text, subtitles, lyrics or data
export default function SaveTranscriptMenu({ label, onSave, variant = 'secondary', size = 'xs' }: SaveTranscriptMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant={variant} size={size} />}>
        <Save /> {label} <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* Base UI only renders a menu label inside a group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Save as</DropdownMenuLabel>
          {TRANSCRIPT_FORMATS.map((format) => (
            <DropdownMenuItem key={format} onClick={() => onSave(format)}>{TRANSCRIPT_FORMAT_LABELS[format]}</DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
