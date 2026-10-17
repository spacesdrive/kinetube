import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRANSCRIPTION_LANGUAGES } from '@/lib/languages';

export interface LanguageSelectProps {
  value: string;
  onChange(language: string): void;
}

function languageLabel(value: string): string {
  return TRANSCRIPTION_LANGUAGES.find((language) => language.value === value)?.label ?? value;
}

export default function LanguageSelect({ value, onChange }: LanguageSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] text-ink-muted">Language</Label>
      <Select value={value} onValueChange={(next) => { if (next) onChange(next); }}>
        <SelectTrigger aria-label="Language" className="w-full"><SelectValue>{languageLabel(value)}</SelectValue></SelectTrigger>
        <SelectContent>
          {TRANSCRIPTION_LANGUAGES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
