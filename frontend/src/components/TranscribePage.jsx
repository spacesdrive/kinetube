import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Download, RefreshCw, CheckCircle, AlertTriangle,
  X, FileText, ChevronDown, ChevronUp, Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ── Model card ────────────────────────────────────────────────────────────────
function ModelCard({ model, selected, onSelect, onDownload, downloading }) {
  return (
    <div
      onClick={() => model.ready && onSelect(model.key)}
      className={cn(
        'flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all duration-150',
        selected
          ? 'border-purple-500 bg-purple-500/10 shadow-sm ring-1 ring-purple-500/30'
          : model.ready
          ? 'border-border bg-card hover:border-muted-foreground/30'
          : 'border-border bg-muted cursor-default opacity-75'
      )}
    >
      <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', model.ready ? 'bg-green-400' : 'bg-muted-foreground/30')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold capitalize">{model.key}</p>
        <p className="text-xs text-muted-foreground">{model.label.split('(')[1]?.replace(')', '') || model.label}</p>
      </div>
      {selected && <div className="w-3.5 h-3.5 rounded-full bg-purple-500 flex-shrink-0" />}
      {!model.ready && (
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs px-2.5"
          onClick={(e) => { e.stopPropagation(); onDownload(model.key); }}
          disabled={downloading}
        >
          {downloading ? <Spinner size={11} className="mr-1" /> : <Download size={11} className="mr-1" />}
          Get
        </Button>
      )}
    </div>
  );
}

// ── File item card ────────────────────────────────────────────────────────────
function FileItem({ item, onRemove, batchRunning }) {
  const [showResult, setShowResult] = useState(false);

  const saveTxt = () => {
    const blob = new Blob([item.result], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = item.name.replace(/\.[^.]+$/, '') + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Status icon */}
          <div className="flex-shrink-0 w-5 flex justify-center">
            {item.status === 'pending'      && <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />}
            {item.status === 'transcribing' && <Spinner size={14} className="text-purple-500" />}
            {item.status === 'done'         && <CheckCircle size={15} className="text-green-500" />}
            {item.status === 'error'        && <AlertTriangle size={15} className="text-red-500" />}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.status === 'pending' && <p className="text-xs text-muted-foreground">Pending</p>}
            {item.status === 'transcribing' && <p className="text-xs text-purple-500 truncate">{item.phase || 'Processing…'}</p>}
            {item.status === 'error' && <p className="text-xs text-red-400 truncate">{item.error}</p>}
            {item.status === 'done' && (
              <p className="text-xs text-muted-foreground">
                {item.result.split(/\s+/).filter(Boolean).length} words
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {item.status === 'done' && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => navigator.clipboard?.writeText(item.result)}
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={saveTxt}
                >
                  <Download size={11} className="mr-1" />
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowResult((v) => !v)}
                >
                  {showResult ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </Button>
              </>
            )}
            {!batchRunning && item.status !== 'transcribing' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground/50 hover:text-red-400"
                onClick={() => onRemove(item.id)}
              >
                <X size={13} />
              </Button>
            )}
          </div>
        </div>

        {/* Per-item progress */}
        {item.status === 'transcribing' && (
          <div className="px-4 pb-3">
            {item.progress === 0 ? (
              <div className="h-1.5 w-full rounded-full bg-purple-100 overflow-hidden">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
              </div>
            ) : (
              <Progress value={item.progress} className="h-1.5 [&>div]:bg-purple-500" />
            )}
          </div>
        )}

        {/* Expanded result */}
        {item.status === 'done' && showResult && (
          <div className="px-4 pb-4 bg-muted/30 border-t">
            <Textarea
              readOnly
              value={item.result}
              rows={6}
              className="mt-3 text-sm font-mono resize-y"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LANGUAGES = [
  { label: 'Auto-detect', value: 'auto' },
  { label: 'English',     value: 'en'   },
  { label: 'Spanish',     value: 'es'   },
  { label: 'French',      value: 'fr'   },
  { label: 'German',      value: 'de'   },
  { label: 'Italian',     value: 'it'   },
  { label: 'Portuguese',  value: 'pt'   },
  { label: 'Chinese',     value: 'zh'   },
  { label: 'Japanese',    value: 'ja'   },
  { label: 'Korean',      value: 'ko'   },
  { label: 'Arabic',      value: 'ar'   },
  { label: 'Hindi',       value: 'hi'   },
  { label: 'Russian',     value: 'ru'   },
];

export default function TranscribePage() {
  const [whisperReady,    setWhisperReady]    = useState(false);
  const [setupLoading,    setSetupLoading]    = useState(false);
  const [setupProgress,   setSetupProgress]   = useState(0);
  const [setupPhase,      setSetupPhase]      = useState('');
  const [setupError,      setSetupError]      = useState('');
  const [models,          setModels]          = useState([]);
  const [selectedModel,   setSelectedModel]   = useState('base');
  const [downloadingModel, setDownloadingModel] = useState(null);
  const [modelProgress,   setModelProgress]   = useState(0);
  const [files,           setFiles]           = useState([]);
  const [localPathInput,  setLocalPathInput]  = useState('');
  const [dragging,        setDragging]        = useState(false);
  const [language,        setLanguage]        = useState('auto');
  const [batchRunning,    setBatchRunning]    = useState(false);
  const fileInputRef = useRef(null);
  const abortRef     = useRef(false);

  useEffect(() => {
    fetch('/api/transcribe/setup/check')
      .then((r) => r.json())
      .then((d) => { setWhisperReady(d.ready); setModels(d.models || []); })
      .catch(console.error);
  }, []);

  const refreshModels = () => {
    fetch('/api/transcribe/models')
      .then((r) => r.json())
      .then((d) => setModels(d.models || []))
      .catch(console.error);
  };

  const runSetup = useCallback(() => {
    setSetupLoading(true);
    setSetupPhase('Connecting…');
    setSetupError('');
    const es = new EventSource('/api/transcribe/setup');
    let receivedEvent = false;
    const connectTimeout = setTimeout(() => {
      if (!receivedEvent) { es.close(); setSetupLoading(false); setSetupError('Could not connect. Try restarting the app.'); }
    }, 12000);
    es.addEventListener('connected', () => { receivedEvent = true; clearTimeout(connectTimeout); setSetupPhase('Downloading whisper.cpp…'); });
    es.addEventListener('phase', (e) => { receivedEvent = true; clearTimeout(connectTimeout); const d = JSON.parse(e.data); setSetupPhase(d.message || d.phase); });
    es.addEventListener('progress', (e) => { receivedEvent = true; const d = JSON.parse(e.data); setSetupProgress(d.percent || 0); });
    es.addEventListener('done', (e) => { clearTimeout(connectTimeout); const d = JSON.parse(e.data); es.close(); setSetupLoading(false); if (d.success) { setWhisperReady(true); setModels(d.models || []); } else { setSetupError(d.message || 'Setup failed.'); } });
    es.onerror = () => { clearTimeout(connectTimeout); es.close(); setSetupLoading(false); setSetupError('Setup connection lost.'); };
  }, []);

  const downloadModel = useCallback((modelKey) => {
    setDownloadingModel(modelKey);
    setModelProgress(0);
    const es = new EventSource(`/api/transcribe/model/ensure?model=${modelKey}`);
    es.addEventListener('progress', (e) => { const d = JSON.parse(e.data); setModelProgress(d.percent || 0); });
    es.addEventListener('done', (e) => { const d = JSON.parse(e.data); es.close(); setDownloadingModel(null); setModels(d.models || []); if (d.success) setSelectedModel(modelKey); });
    es.onerror = () => { es.close(); setDownloadingModel(null); };
  }, []);

  const updateFile = useCallback((id, updates) =>
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f)), []);

  const addFiles = useCallback((fileList) => {
    const items = Array.from(fileList).map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f, name: f.name, localPath: '', status: 'pending', progress: 0, phase: '', result: '', error: '',
    }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const addByPath = useCallback(() => {
    const p = localPathInput.trim();
    if (!p) return;
    const name = p.split(/[\\/]/).pop();
    setFiles((prev) => [...prev, {
      id: `path-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: null, name, localPath: p, status: 'pending', progress: 0, phase: '', result: '', error: '',
    }]);
    setLocalPathInput('');
  }, [localPathInput]);

  const removeFile  = useCallback((id) => setFiles((prev) => prev.filter((f) => f.id !== id)), []);
  const clearAll    = useCallback(() => setFiles([]), []);

  const onDragOver  = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop      = useCallback((e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files); }, [addFiles]);
  const onFileSelect = useCallback((e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }, [addFiles]);

  const readSSEForItem = useCallback((id, stream) => {
    return new Promise((resolve) => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buf = '', accumulated = '';
      const pump = () => {
        reader.read().then(({ done, value }) => {
          if (done) { resolve(); return; }
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let d; try { d = JSON.parse(line.slice(6)); } catch { continue; }
            if (d.phase !== undefined && d.message !== undefined) updateFile(id, { phase: d.message });
            if (d.percent !== undefined) updateFile(id, { progress: d.percent });
            if (d.text !== undefined && d.success === undefined) {
              accumulated += (accumulated ? ' ' : '') + d.text;
              updateFile(id, { result: accumulated });
            }
            if (d.success !== undefined) {
              if (d.success) updateFile(id, { status: 'done', result: d.text || accumulated, progress: 100 });
              else           updateFile(id, { status: 'error', error: d.message || 'Transcription failed' });
              resolve(); return;
            }
          }
          pump();
        }).catch(() => resolve());
      };
      pump();
    });
  }, [updateFile]);

  const transcribeItem = useCallback(async (item, model, lang) => {
    updateFile(item.id, { status: 'transcribing', progress: 0, phase: 'Starting…', result: '', error: '' });
    try {
      let resp;
      if (item.file) {
        updateFile(item.id, { phase: 'Uploading…' });
        const fd = new FormData();
        fd.append('file', item.file);
        fd.append('model', model);
        fd.append('language', lang);
        resp = await fetch('/api/transcribe/upload', { method: 'POST', body: fd });
      } else {
        resp = await fetch('/api/transcribe/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: item.localPath, model, language: lang }),
        });
      }
      if (!resp.ok) {
        let errMsg = 'Request failed';
        try { const d = await resp.json(); errMsg = d.error || errMsg; } catch {}
        throw new Error(errMsg);
      }
      updateFile(item.id, { phase: 'Transcribing…' });
      await readSSEForItem(item.id, resp.body);
    } catch (err) {
      updateFile(item.id, { status: 'error', error: err.message });
    }
  }, [updateFile, readSSEForItem]);

  const startBatch = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (!pending.length) return;
    setBatchRunning(true);
    abortRef.current = false;
    for (const item of pending) {
      if (abortRef.current) break;
      await transcribeItem(item, selectedModel, language);
    }
    setBatchRunning(false);
  }, [files, selectedModel, language, transcribeItem]);

  const stopBatch = useCallback(() => { abortRef.current = true; }, []);

  const saveAll = useCallback(() => {
    files.filter((f) => f.status === 'done').forEach((f, i) => {
      setTimeout(() => {
        const blob = new Blob([f.result], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = f.name.replace(/\.[^.]+$/, '') + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, i * 150);
    });
  }, [files]);

  const selectedModelReady = models.find((m) => m.key === selectedModel)?.ready ?? false;
  const pendingCount = files.filter((f) => f.status === 'pending' || f.status === 'error').length;
  const doneCount    = files.filter((f) => f.status === 'done').length;
  const canStart     = whisperReady && selectedModelReady && pendingCount > 0 && !batchRunning;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg mb-4">
          <FileText size={26} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Transcribe</h1>
        <p className="text-muted-foreground mt-2">
          Convert audio &amp; video to text using Whisper AI — runs entirely on your computer
        </p>
      </div>

      {/* Setup card */}
      {!whisperReady && (
        <Alert variant="default" className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-800">whisper.cpp not installed</AlertTitle>
          <AlertDescription className="text-amber-700">
            <p className="mb-3">The transcription engine needs to be downloaded once (~25 MB).</p>
            {setupLoading ? (
              <div className="space-y-2">
                <p className="text-sm">{setupPhase}</p>
                <Progress value={setupProgress} className="h-2" />
              </div>
            ) : (
              <Button size="sm" onClick={runSetup}>
                <Download size={14} className="mr-2" />
                Install whisper.cpp
              </Button>
            )}
            {setupError && <p className="mt-3 text-xs text-red-600">{setupError}</p>}
          </AlertDescription>
        </Alert>
      )}

      {whisperReady && (
        <div className="space-y-5">
          {/* Model selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Whisper Model</CardTitle>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={refreshModels}>
                  <RefreshCw size={13} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {models.map((m) => (
                  <ModelCard
                    key={m.key}
                    model={m}
                    selected={selectedModel === m.key}
                    onSelect={setSelectedModel}
                    onDownload={downloadModel}
                    downloading={downloadingModel === m.key}
                  />
                ))}
              </div>
              {downloadingModel && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Downloading {downloadingModel} model…</p>
                  <Progress value={modelProgress} className="h-1.5 [&>div]:bg-purple-500" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* File input */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Files</CardTitle>
                {files.length > 0 && !batchRunning && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-red-500" onClick={clearAll}>
                    Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Drop zone */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-7 cursor-pointer transition-all',
                  dragging ? 'border-purple-400 bg-purple-50' : 'border-border hover:border-muted-foreground/40 bg-muted/20'
                )}
              >
                <Upload size={24} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-medium">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground/70">MP3, MP4, WAV, M4A, OGG, FLAC, WEBM… · Multiple files supported</p>
                <input ref={fileInputRef} type="file" className="hidden" accept="audio/*,video/*" multiple onChange={onFileSelect} />
              </div>

              {/* Local path input */}
              <div className="flex gap-2">
                <Input
                  value={localPathInput}
                  onChange={(e) => setLocalPathInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addByPath()}
                  placeholder="or paste a local file path…"
                  className="font-mono text-sm"
                />
                <Button type="button" variant="outline" onClick={addByPath} disabled={!localPathInput.trim()}>
                  <Plus size={14} className="mr-1" /> Add
                </Button>
              </div>

              {/* Language */}
              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold text-muted-foreground">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((item) => (
                <FileItem key={item.id} item={item} onRemove={removeFile} batchRunning={batchRunning} />
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {batchRunning ? (
              <Button
                type="button"
                variant="destructive"
                className="flex-1 h-12 text-base"
                onClick={stopBatch}
              >
                <X size={18} className="mr-2" />
                Stop after current file
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canStart}
                className="flex-1 h-12 text-base bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={startBatch}
              >
                <FileText size={18} className="mr-2" />
                {files.length === 0
                  ? 'Transcribe'
                  : pendingCount > 1
                  ? `Transcribe All (${pendingCount} files)`
                  : 'Transcribe'}
              </Button>
            )}

            {doneCount > 1 && !batchRunning && (
              <Button
                type="button"
                className="h-12 px-5 text-base"
                onClick={saveAll}
                title={`Save ${doneCount} transcriptions`}
              >
                <Download size={18} className="mr-2" />
                Save All
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
