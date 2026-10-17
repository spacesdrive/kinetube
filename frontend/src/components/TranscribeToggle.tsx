import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface TranscribeToggleProps {
  id: string;
  isOn: boolean;
  onChange(isOn: boolean): void;
}

export default function TranscribeToggle({ id, isOn, onChange }: TranscribeToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-divider pt-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-ink">Transcribe after download</Label>
        <p className="mt-0.5 text-xs text-ink-muted">Writes a text transcript with Whisper, on this computer</p>
      </div>
      <Switch id={id} checked={isOn} onCheckedChange={onChange} />
    </div>
  );
}
