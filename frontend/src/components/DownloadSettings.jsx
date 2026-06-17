import { useState, useRef } from 'react';
import { Settings, FolderOpen, Hash, Type, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const TEMPLATE_VARS = [
  { label: 'Title',    value: '%(title)s',       desc: 'Video title' },
  { label: 'Uploader', value: '%(uploader)s',    desc: 'Channel name' },
  { label: 'Date',     value: '%(upload_date)s', desc: 'YYYYMMDD' },
  { label: 'ID',       value: '%(id)s',          desc: 'Video ID' },
  { label: 'Duration', value: '%(duration)s',    desc: 'Seconds' },
  { label: 'Views',    value: '%(view_count)s',  desc: 'View count' },
];

export default function DownloadSettings({ settings, onChange }) {
  const [open, setOpen]           = useState(false);
  const [browsing, setBrowsing]   = useState(false);
  const [pathError, setPathError] = useState('');
  const templateInputRef          = useRef(null);

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
    requestAnimationFrame(() => {
      input.focus();
      const newPos = start + varValue.length;
      input.setSelectionRange(newPos, newPos);
    });
  };

  const previewName = () => {
    let name = '';
    if (settings.useNumbering) name += `${String(settings.startNumber).padStart(2, '0')} - `;
    if (settings.prefix.trim()) name += `${settings.prefix.trim()} `;
    const mainPart = settings.useCustomFilename && settings.customFilenameTemplate.trim()
      ? settings.customFilenameTemplate
          .replace('%(title)s', 'My Video Title')
          .replace('%(uploader)s', 'Channel Name')
          .replace('%(upload_date)s', '20240315')
          .replace('%(id)s', 'dQw4w9WgXcQ')
          .replace('%(duration)s', '213')
          .replace('%(view_count)s', '1234567')
          .replace(/%([\w]+)s/g, '($1)')
      : 'Video Title';
    name += mainPart;
    if (settings.suffix.trim()) name += ` ${settings.suffix.trim()}`;
    name += '.mp4';
    return name;
  };

  const hasCustomSettings =
    settings.outputDir.trim() || settings.prefix.trim() || settings.suffix.trim() ||
    settings.useNumbering || settings.useCustomFilename;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-3xl mx-auto">
      <CollapsibleTrigger
        className={cn(
          'flex items-center gap-1.5 text-sm transition-colors px-1.5 py-1 rounded-lg hover:bg-muted cursor-pointer',
          hasCustomSettings ? 'text-blue-600 font-medium' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Settings size={14} />
        <span>Download Settings</span>
        {hasCustomSettings && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700">Custom</Badge>
        )}
        {open ? <ChevronUp size={13} className="ml-0.5" /> : <ChevronDown size={13} className="ml-0.5" />}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 bg-card rounded-2xl border shadow-sm p-5 space-y-5">

          {/* Output folder */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Output Folder</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <FolderOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={settings.outputDir}
                  onChange={(e) => { onChange({ ...settings, outputDir: e.target.value }); setPathError(''); }}
                  onBlur={handleDirBlur}
                  placeholder="Default: backend/downloads"
                  className="pl-9 font-mono text-xs"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleBrowse}
                disabled={browsing}
                className="flex-shrink-0"
              >
                {browsing ? 'Opening...' : 'Browse'}
              </Button>
            </div>
            {pathError && <p className="mt-1.5 text-xs text-amber-600">{pathError}</p>}
          </section>

          {/* File naming */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">File Naming</p>

            {/* Main filename */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Main filename</Label>
                <div className="flex items-center gap-2">
                  <Type size={12} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {settings.useCustomFilename ? 'Custom template' : 'Original title'}
                  </span>
                  <Switch
                    checked={settings.useCustomFilename}
                    onCheckedChange={(v) => onChange({ ...settings, useCustomFilename: v })}
                  />
                </div>
              </div>

              {settings.useCustomFilename ? (
                <div className="space-y-2">
                  <Input
                    ref={templateInputRef}
                    value={settings.customFilenameTemplate}
                    onChange={(e) => onChange({ ...settings, customFilenameTemplate: e.target.value })}
                    placeholder="%(title)s"
                    className="font-mono border-blue-200 focus-visible:ring-blue-400"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARS.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        title={v.desc}
                        onClick={() => insertVar(v.value)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted hover:bg-blue-100 hover:text-blue-700 text-muted-foreground text-xs font-medium transition-colors border border-transparent hover:border-blue-200"
                      >
                        <Plus size={10} />
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click a chip to insert a yt-dlp template variable at the cursor.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-1">
                  Files will be named using the original video title from YouTube.
                </p>
              )}
            </div>

            {/* Prefix / Suffix */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs mb-1 block">Prefix</Label>
                <Input
                  value={settings.prefix}
                  onChange={(e) => onChange({ ...settings, prefix: e.target.value })}
                  placeholder="e.g. [2024]"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Suffix</Label>
                <Input
                  value={settings.suffix}
                  onChange={(e) => onChange({ ...settings, suffix: e.target.value })}
                  placeholder="e.g. [HD]"
                />
              </div>
            </div>

            {/* Numbering */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-number"
                  checked={settings.useNumbering}
                  onCheckedChange={(v) => onChange({ ...settings, useNumbering: v })}
                />
                <Label htmlFor="auto-number" className="flex items-center gap-1.5 cursor-pointer">
                  <Hash size={12} className="text-muted-foreground" />
                  Auto-number files
                </Label>
              </div>
              {settings.useNumbering && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Start at</span>
                  <Input
                    type="number"
                    min={1}
                    value={settings.startNumber}
                    onChange={(e) => onChange({ ...settings, startNumber: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 text-center"
                  />
                </div>
              )}
            </div>

            {/* Preview */}
            {(settings.prefix.trim() || settings.suffix.trim() || settings.useNumbering || settings.useCustomFilename) && (
              <div className="mt-3 px-3 py-2.5 bg-blue-50 rounded-xl">
                <span className="text-xs font-medium text-blue-500 mr-1.5">Preview:</span>
                <span className="text-xs font-mono text-blue-700 break-all">{previewName()}</span>
              </div>
            )}
          </section>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
