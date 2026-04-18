/**
 * SettingsPage
 *
 * Manages user preferences persisted to localStorage under the key
 * "kinetube_settings".
 *
 * Sections:
 *   • Transcription  — default model and language for Whisper
 *   • Downloads      — default output directory, quality, file naming
 */

import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Folder, CheckCircle } from 'lucide-react';

// ── Persisted settings schema ─────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  // Transcription
  transcription: {
    defaultModel:    'base',
    defaultLanguage: 'auto',
  },
  // Downloads
  downloads: {
    outputDir:   '',
    defaultQuality: 'best',
    useNumbering:   false,
    prefix:         '',
    suffix:         '',
    useCustomFilename: false,
    customFilenameTemplate: '%(title)s',
  },
};

const STORAGE_KEY = 'kinetube_settings';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    // Deep merge so new keys added in DEFAULT_SETTINGS are always present
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

// ── Inline section components ─────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-blue-500' : 'bg-gray-200'}`}
      style={{ minWidth: '2.5rem', height: '1.375rem' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(1.125rem)' : 'translateX(0)' }}
      />
    </button>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

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

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => loadSettings());
  const [saved, setSaved]       = useState(false);
  const [browsingFolder, setBrowsingFolder] = useState(false);

  const update = useCallback((section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
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
      const r = await fetch('/api/dialog/folder');
      const d = await r.json();
      if (d.path) update('downloads', 'outputDir', d.path);
    } finally {
      setBrowsingFolder(false);
    }
  }, [update]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Preferences are saved locally in your browser</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-5">

        {/* ── Transcription settings ── */}
        <SectionCard title="Transcription">
          <Row
            label="Default model"
            hint="Larger models are more accurate but slower and need more disk space."
          >
            <SelectField
              value={settings.transcription.defaultModel}
              onChange={(v) => update('transcription', 'defaultModel', v)}
              options={WHISPER_MODELS}
            />
          </Row>

          <Row label="Default language" hint="Auto-detect works well for most content.">
            <SelectField
              value={settings.transcription.defaultLanguage}
              onChange={(v) => update('transcription', 'defaultLanguage', v)}
              options={LANGUAGES}
            />
          </Row>

        </SectionCard>

        {/* ── Download settings ── */}
        <SectionCard title="Downloads">
          <Row label="Default output folder" hint="Leave empty to use the default downloads folder.">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings.downloads.outputDir}
                onChange={(e) => update('downloads', 'outputDir', e.target.value)}
                placeholder="C:\Users\…\Downloads"
                className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 transition-colors w-52 font-mono text-xs"
              />
              <button
                type="button"
                onClick={browseFolder}
                disabled={browsingFolder}
                className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                title="Browse…"
              >
                <Folder size={14} />
              </button>
            </div>
          </Row>

          <Row label="Default quality">
            <SelectField
              value={settings.downloads.defaultQuality}
              onChange={(v) => update('downloads', 'defaultQuality', v)}
              options={QUALITIES}
            />
          </Row>

          <Row label="Auto-number files" hint="Prefix downloaded files with a sequence number.">
            <Toggle
              checked={settings.downloads.useNumbering}
              onChange={(v) => update('downloads', 'useNumbering', v)}
            />
          </Row>

          <Row label="Filename prefix">
            <input
              type="text"
              value={settings.downloads.prefix}
              onChange={(e) => update('downloads', 'prefix', e.target.value)}
              placeholder="e.g. 2024-"
              className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 transition-colors w-40"
            />
          </Row>

          <Row label="Filename suffix">
            <input
              type="text"
              value={settings.downloads.suffix}
              onChange={(e) => update('downloads', 'suffix', e.target.value)}
              placeholder="e.g. _HD"
              className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 transition-colors w-40"
            />
          </Row>

          <Row label="Custom filename template" hint="yt-dlp variables like %(title)s, %(id)s, %(uploader)s.">
            <div className="flex items-center gap-2">
              <Toggle
                checked={settings.downloads.useCustomFilename}
                onChange={(v) => update('downloads', 'useCustomFilename', v)}
              />
              {settings.downloads.useCustomFilename && (
                <input
                  type="text"
                  value={settings.downloads.customFilenameTemplate}
                  onChange={(e) => update('downloads', 'customFilenameTemplate', e.target.value)}
                  placeholder="%(title)s"
                  className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 transition-colors w-44 font-mono text-xs"
                />
              )}
            </div>
          </Row>
        </SectionCard>

        {/* ── About ── */}
        <SectionCard title="About">
          <div className="text-sm text-gray-500 space-y-1">
            <p><span className="font-semibold text-gray-700">KineTube</span> — local YouTube &amp; Instagram downloader</p>
            <p>Powered by <span className="font-medium">yt-dlp</span>, <span className="font-medium">ffmpeg</span>, <span className="font-medium">instaloader</span>, and <span className="font-medium">whisper.cpp</span></p>
            <p className="text-xs text-gray-400 mt-3">All downloads and transcriptions happen locally on your machine. No data is sent to any third-party server.</p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
