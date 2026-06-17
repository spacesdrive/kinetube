import { useState, useCallback } from 'react';
import { Save, RotateCcw, Folder, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// ── Persisted settings schema ─────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  transcription: {
    defaultModel:    'base',
    defaultLanguage: 'auto',
  },
  downloads: {
    outputDir:              '',
    defaultQuality:         'best',
    useNumbering:           false,
    prefix:                 '',
    suffix:                 '',
    useCustomFilename:      false,
    customFilenameTemplate: '%(title)s',
  },
};

const STORAGE_KEY = 'kinetube_settings';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      transcription: { ...DEFAULT_SETTINGS.transcription, ...parsed.transcription },
      downloads:     { ...DEFAULT_SETTINGS.downloads,     ...parsed.downloads     },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WHISPER_MODELS = [
  { label: 'Tiny  (~75 MB)',    value: 'tiny'   },
  { label: 'Base  (~142 MB)',   value: 'base'   },
  { label: 'Small (~466 MB)',   value: 'small'  },
  { label: 'Medium (~1.5 GB)', value: 'medium'  },
  { label: 'Large (~2.9 GB)',  value: 'large'   },
];

const LANGUAGES = [
  { label: 'Auto-detect', value: 'auto' },
  { label: 'English',     value: 'en'   },
  { label: 'Spanish',     value: 'es'   },
  { label: 'French',      value: 'fr'   },
  { label: 'German',      value: 'de'   },
  { label: 'Portuguese',  value: 'pt'   },
  { label: 'Chinese',     value: 'zh'   },
  { label: 'Japanese',    value: 'ja'   },
  { label: 'Korean',      value: 'ko'   },
  { label: 'Arabic',      value: 'ar'   },
  { label: 'Hindi',       value: 'hi'   },
  { label: 'Russian',     value: 'ru'   },
];

const QUALITIES = [
  { label: 'Best available', value: 'best'  },
  { label: '1080p',          value: '1080p' },
  { label: '720p',           value: '720p'  },
  { label: '480p',           value: '480p'  },
];

// ── Setting row layout ────────────────────────────────────────────────────────

function SettingRow({ label, hint, children }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => loadSettings());
  const [saved, setSaved]       = useState(false);
  const [browsingFolder, setBrowsingFolder] = useState(false);

  const update = useCallback((section, key, value) => {
    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [settings]);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
  }, []);

  const browseFolder = useCallback(async () => {
    setBrowsingFolder(true);
    try {
      let chosen = null;
      if (window.electronAPI?.openFolderDialog) {
        chosen = await window.electronAPI.openFolderDialog();
      } else {
        const r = await fetch('/api/dialog/folder');
        const d = await r.json();
        chosen = d.path;
      }
      if (chosen) update('downloads', 'outputDir', chosen);
    } finally {
      setBrowsingFolder(false);
    }
  }, [update]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Preferences are saved locally in your browser</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw size={13} /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="space-y-5">

        {/* Transcription */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Transcription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow
              label="Default model"
              hint="Larger models are more accurate but slower and need more disk space."
            >
              <Select
                value={settings.transcription.defaultModel}
                onValueChange={(v) => update('transcription', 'defaultModel', v)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WHISPER_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            <SettingRow label="Default language" hint="Auto-detect works well for most content.">
              <Select
                value={settings.transcription.defaultLanguage}
                onValueChange={(v) => update('transcription', 'defaultLanguage', v)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>
          </CardContent>
        </Card>

        {/* Downloads */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Downloads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Default output folder" hint="Leave empty to use the default downloads folder.">
              <div className="flex items-center gap-2">
                <Input
                  value={settings.downloads.outputDir}
                  onChange={(e) => update('downloads', 'outputDir', e.target.value)}
                  placeholder="C:\Users\…\Downloads"
                  className="w-52 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={browseFolder}
                  disabled={browsingFolder}
                  title="Browse…"
                  className="flex-shrink-0"
                >
                  <Folder size={14} />
                </Button>
              </div>
            </SettingRow>

            <Separator />

            <SettingRow label="Default quality">
              <Select
                value={settings.downloads.defaultQuality}
                onValueChange={(v) => update('downloads', 'defaultQuality', v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITIES.map((q) => (
                    <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            <SettingRow label="Auto-number files" hint="Prefix downloaded files with a sequence number.">
              <Switch
                checked={settings.downloads.useNumbering}
                onCheckedChange={(v) => update('downloads', 'useNumbering', v)}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="Filename prefix">
              <Input
                value={settings.downloads.prefix}
                onChange={(e) => update('downloads', 'prefix', e.target.value)}
                placeholder="e.g. 2024-"
                className="w-40"
              />
            </SettingRow>

            <Separator />

            <SettingRow label="Filename suffix">
              <Input
                value={settings.downloads.suffix}
                onChange={(e) => update('downloads', 'suffix', e.target.value)}
                placeholder="e.g. _HD"
                className="w-40"
              />
            </SettingRow>

            <Separator />

            <SettingRow
              label="Custom filename template"
              hint="yt-dlp variables like %(title)s, %(id)s, %(uploader)s."
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.downloads.useCustomFilename}
                  onCheckedChange={(v) => update('downloads', 'useCustomFilename', v)}
                />
                {settings.downloads.useCustomFilename && (
                  <Input
                    value={settings.downloads.customFilenameTemplate}
                    onChange={(e) => update('downloads', 'customFilenameTemplate', e.target.value)}
                    placeholder="%(title)s"
                    className="w-44 font-mono text-xs"
                  />
                )}
              </div>
            </SettingRow>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-semibold text-foreground">KineTube</span> — local YouTube &amp; Instagram downloader
            </p>
            <p>
              Powered by{' '}
              {['yt-dlp', 'ffmpeg', 'instaloader', 'whisper.cpp'].map((t) => (
                <Badge key={t} variant="secondary" className="mr-1 text-[11px]">{t}</Badge>
              ))}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              All downloads and transcriptions happen locally on your machine. No data is sent to any third-party server.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
