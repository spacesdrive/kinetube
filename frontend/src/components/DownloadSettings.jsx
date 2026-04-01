import { useState, useRef } from 'react';
import { Settings, FolderOpen, ChevronDown, ChevronUp, Hash, Type, Plus } from 'lucide-react';

// ── yt-dlp template variable chips ───────────────────────────────────────────

const TEMPLATE_VARS = [
  { label: 'Title',    value: '%(title)s',       desc: 'Video title' },
  { label: 'Uploader', value: '%(uploader)s',    desc: 'Channel name' },
  { label: 'Date',     value: '%(upload_date)s', desc: 'YYYYMMDD' },
  { label: 'ID',       value: '%(id)s',          desc: 'Video ID' },
  { label: 'Duration', value: '%(duration)s',    desc: 'Seconds' },
  { label: 'Views',    value: '%(view_count)s',  desc: 'View count' },
];

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ on, onToggle, label, icon }) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center gap-2 select-none">
      <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${on ? 'bg-blue-500' : 'bg-gray-200'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-sm text-gray-600 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DownloadSettings({ settings, onChange }) {
  const [open, setOpen]       = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [pathError, setPathError] = useState('');
  const templateInputRef = useRef(null);

  // ── Folder browser ──────────────────────────────────────────────────────────

  const handleBrowse = async () => {
    setBrowsing(true);
    setPathError('');
    try {
      const res  = await fetch('/api/dialog/folder');
      const data = await res.json();
      if (data.path) onChange({ ...settings, outputDir: data.path });
    } catch {
      setPathError('Could not open folder dialog.');
    } finally {
      setBrowsing(false);
    }
  };

  const handleDirBlur = async () => {
    if (!settings.outputDir.trim()) { setPathError(''); return; }
    try {
      const res  = await fetch(`/api/validate-path?dir=${encodeURIComponent(settings.outputDir)}`);
      const data = await res.json();
      setPathError(data.valid ? '' : 'Folder not found — downloads will use the default folder.');
    } catch {}
  };

  // ── Template variable insertion ─────────────────────────────────────────────

  const insertVar = (varValue) => {
    const input = templateInputRef.current;
    if (!input) {
      onChange({ ...settings, customFilenameTemplate: settings.customFilenameTemplate + varValue });
      return;
    }
    const start = input.selectionStart ?? settings.customFilenameTemplate.length;
    const end   = input.selectionEnd   ?? settings.customFilenameTemplate.length;
    const next  = settings.customFilenameTemplate.slice(0, start) + varValue + settings.customFilenameTemplate.slice(end);
    onChange({ ...settings, customFilenameTemplate: next });
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + varValue.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  // ── Filename preview ────────────────────────────────────────────────────────

  const previewName = () => {
    let name = '';
    if (settings.useNumbering) name += `${String(settings.startNumber).padStart(2, '0')} - `;
    if (settings.prefix.trim()) name += `${settings.prefix.trim()} `;

    // Render template vars as human-readable stand-ins
    const mainPart = settings.useCustomFilename && settings.customFilenameTemplate.trim()
      ? settings.customFilenameTemplate
          .replace('%(title)s',       'My Video Title')
          .replace('%(uploader)s',    'Channel Name')
          .replace('%(upload_date)s', '20240315')
          .replace('%(id)s',          'dQw4w9WgXcQ')
          .replace('%(duration)s',    '213')
          .replace('%(view_count)s',  '1234567')
          .replace(/%([\w]+)s/g,      '($1)')       // any remaining vars
      : 'Video Title';

    name += mainPart;
    if (settings.suffix.trim()) name += ` ${settings.suffix.trim()}`;
    name += '.mp4';
    return name;
  };

  const hasCustomSettings =
    settings.outputDir.trim()      ||
    settings.prefix.trim()         ||
    settings.suffix.trim()         ||
    settings.useNumbering          ||
    settings.useCustomFilename;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm transition-colors px-1.5 py-1 rounded-lg hover:bg-gray-100 ${
          hasCustomSettings ? 'text-blue-600 font-medium' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Settings size={14} />
        <span>Download Settings</span>
        {hasCustomSettings && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
            Custom
          </span>
        )}
        {open ? <ChevronUp size={13} className="ml-0.5" /> : <ChevronDown size={13} className="ml-0.5" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">

          {/* ── Output folder ── */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Output Folder
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <FolderOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={settings.outputDir}
                  onChange={(e) => { onChange({ ...settings, outputDir: e.target.value }); setPathError(''); }}
                  onBlur={handleDirBlur}
                  placeholder="Default: backend/downloads"
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white transition-colors font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleBrowse}
                disabled={browsing}
                className="px-4 py-2.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                {browsing ? 'Opening...' : 'Browse'}
              </button>
            </div>
            {pathError && <p className="mt-1.5 text-xs text-amber-600">{pathError}</p>}
          </section>

          {/* ── File naming ── */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              File Naming
            </p>

            {/* Main filename */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500">Main filename</label>
                <Toggle
                  on={settings.useCustomFilename}
                  onToggle={() => onChange({ ...settings, useCustomFilename: !settings.useCustomFilename })}
                  label={settings.useCustomFilename ? 'Custom template' : 'Original title'}
                  icon={<Type size={12} className="text-gray-400" />}
                />
              </div>

              {settings.useCustomFilename ? (
                <div className="space-y-2">
                  <input
                    ref={templateInputRef}
                    type="text"
                    value={settings.customFilenameTemplate}
                    onChange={(e) => onChange({ ...settings, customFilenameTemplate: e.target.value })}
                    placeholder="%(title)s"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-blue-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white transition-colors font-mono"
                  />
                  {/* Variable chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARS.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        title={v.desc}
                        onClick={() => insertVar(v.value)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 text-xs font-medium transition-colors border border-transparent hover:border-blue-200"
                      >
                        <Plus size={10} />
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Click a chip to insert a yt-dlp template variable at the cursor.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-1">
                  Files will be named using the original video title from YouTube.
                </p>
              )}
            </div>

            {/* Prefix / Suffix */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prefix</label>
                <input
                  type="text"
                  value={settings.prefix}
                  onChange={(e) => onChange({ ...settings, prefix: e.target.value })}
                  placeholder="e.g. [2024]"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Suffix</label>
                <input
                  type="text"
                  value={settings.suffix}
                  onChange={(e) => onChange({ ...settings, suffix: e.target.value })}
                  placeholder="e.g. [HD]"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Numbering */}
            <div className="flex items-center gap-4 flex-wrap">
              <Toggle
                on={settings.useNumbering}
                onToggle={() => onChange({ ...settings, useNumbering: !settings.useNumbering })}
                label="Auto-number files"
                icon={<Hash size={12} className="text-gray-400" />}
              />
              {settings.useNumbering && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Start at</span>
                  <input
                    type="number"
                    min={1}
                    value={settings.startNumber}
                    onChange={(e) => onChange({ ...settings, startNumber: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 px-2 py-1 text-center bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-colors text-sm"
                  />
                </div>
              )}
            </div>

            {/* Live preview */}
            {(settings.prefix.trim() || settings.suffix.trim() || settings.useNumbering || settings.useCustomFilename) && (
              <div className="mt-3 px-3 py-2.5 bg-blue-50 rounded-xl">
                <span className="text-xs font-medium text-blue-500 mr-1.5">Preview:</span>
                <span className="text-xs font-mono text-blue-700 break-all">{previewName()}</span>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
