import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface TranscribeToggleProps {
  id: string;
  isOn: boolean;
  onChange(isOn: boolean): void;
}

export default function TranscribeToggle({ id, isOn, onChange }: TranscribeToggleProps) {
  return (
    <div className="flex items-center justify-between border-t pt-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">Transcribe after download</Label>
        <p className="text-xs text-muted-foreground">Writes a text transcript with Whisper, on this computer</p>
      </div>
      <Switch id={id} checked={isOn} onCheckedChange={onChange} />
    </div>
  );
}
