import { Hash } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import FileNameTemplateField from './FileNameTemplateField';
import { hasCustomNaming, previewFileName } from './fileNamePreview';

import type { DownloadSettings } from '@/lib/settings';

export interface FileNameFieldsProps {
  settings: DownloadSettings;
  onChange(settings: DownloadSettings): void;
}

export default function FileNameFields({ settings, onChange }: FileNameFieldsProps) {
  const update = (changes: Partial<DownloadSettings>): void => onChange({ ...settings, ...changes });
  const hasNamingChange = hasCustomNaming({ ...settings, outputDir: '' });

  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">File names</p>
      <FileNameTemplateField
        useCustomFilename={settings.useCustomFilename}
        template={settings.customFilenameTemplate}
        onToggle={(useCustomFilename) => update({ useCustomFilename })}
        onChange={(customFilenameTemplate) => update({ customFilenameTemplate })}
      />

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="file-prefix" className="mb-1 block text-xs">Prefix</Label>
          <Input id="file-prefix" value={settings.prefix} onChange={(event) => update({ prefix: event.target.value })} placeholder="For example [2024]" />
        </div>
        <div>
          <Label htmlFor="file-suffix" className="mb-1 block text-xs">Suffix</Label>
          <Input id="file-suffix" value={settings.suffix} onChange={(event) => update({ suffix: event.target.value })} placeholder="For example [HD]" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="auto-number" checked={settings.useNumbering} onCheckedChange={(useNumbering) => update({ useNumbering })} />
          <Label htmlFor="auto-number" className="flex cursor-pointer items-center gap-1.5">
            <Hash size={12} className="text-muted-foreground" />
            Number the files
          </Label>
        </div>
        {settings.useNumbering && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <label htmlFor="start-number">Start at</label>
            <Input
              id="start-number"
              type="number"
              min={1}
              value={settings.startNumber}
              onChange={(event) => update({ startNumber: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })}
              className="w-16 text-center"
            />
          </div>
        )}
      </div>

      {hasNamingChange && (
        <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2.5">
          <span className="mr-1.5 text-xs font-medium text-blue-500">Preview:</span>
          <span className="break-all font-mono text-xs text-blue-700">{previewFileName(settings)}</span>
        </div>
      )}
    </section>
  );
}
