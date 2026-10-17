import { Plus, Type } from 'lucide-react';
import { useRef } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TEMPLATE_FIELDS } from './fileNamePreview';

export interface FileNameTemplateFieldProps {
  useCustomFilename: boolean;
  template: string;
  onToggle(useCustomFilename: boolean): void;
  onChange(template: string): void;
}

export default function FileNameTemplateField({ useCustomFilename, template, onToggle, onChange }: FileNameTemplateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // inserts at the cursor, then puts the cursor back after what was inserted
  function insertField(fieldValue: string) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? template.length;
    const end = input?.selectionEnd ?? template.length;
    onChange(template.slice(0, start) + fieldValue + template.slice(end));

    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + fieldValue.length, start + fieldValue.length);
    });
  }

  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="custom-file-name" className="text-xs text-muted-foreground">Main file name</Label>
        <div className="flex items-center gap-2">
          <Type size={12} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{useCustomFilename ? 'Custom template' : 'Original title'}</span>
          <Switch id="custom-file-name" checked={useCustomFilename} onCheckedChange={onToggle} />
        </div>
      </div>

      {!useCustomFilename && <p className="py-1 text-xs text-muted-foreground">Files are named after the original title.</p>}
      {useCustomFilename && (
        <div className="space-y-2">
          <Input
            ref={inputRef}
            aria-label="File name template"
            value={template}
            onChange={(event) => onChange(event.target.value)}
            placeholder="%(title)s"
            className="border-blue-200 font-mono focus-visible:ring-blue-400"
          />
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_FIELDS.map((field) => (
              <button
                key={field.value}
                type="button"
                title={field.description}
                onClick={() => insertField(field.value)}
                className="inline-flex items-center gap-1 rounded-lg border border-transparent bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-blue-200 hover:bg-blue-100 hover:text-blue-700"
              >
                <Plus size={10} />
                {field.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Pick a field to insert it at the cursor.</p>
        </div>
      )}
    </div>
  );
}
