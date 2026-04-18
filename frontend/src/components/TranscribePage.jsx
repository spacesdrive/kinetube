/**
 * TranscribePage
 *
 * Standalone transcription UI. Lets users:
 *   1. Drop / browse any audio or video file
 *   2. Choose a Whisper model (auto-downloads if missing)
 *   3. Watch live progress while whisper.cpp runs
 *   4. Read the result and save it as a .txt file
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Download, RefreshCw, CheckCircle, AlertTriangle, X, FileText } from 'lucide-react';

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ percent, pulse = false, color = 'blue' }) {
  const w = Math.min(100, Math.max(0, percent || 0));
  const gradients = {
    blue:   'from-blue-500 to-blue-400',
    purple: 'from-purple-500 to-pink-500',
  };
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradients[color]} transition-[width] duration-500 ${pulse ? 'animate-pulse w-full' : ''}`}
        style={pulse ? undefined : { width: `${w}%` }}
      />
    </div>
  );
}

// ── Model card ────────────────────────────────────────────────────────────────
function ModelCard({ model, selected, onSelect, onDownload, downloading }) {
  return (
    <div
      onClick={() => model.ready && onSelect(model.key)}
      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all duration-150 ${
        selected
          ? 'border-purple-400 bg-purple-50/60 shadow-sm'
          : model.ready
          ? 'border-gray-200 bg-white hover:border-gray-300'
          : 'border-gray-100 bg-gray-50 cursor-default opacity-75'
      }`}
    >
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${model.ready ? 'bg-green-400' : 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 capitalize">{model.key}</p>
        <p className="text-xs text-gray-400">{model.label.split('(')[1]?.replace(')', '') || model.label}</p>
      </div>
      {selected && <div className="w-3.5 h-3.5 rounded-full bg-purple-500 flex-shrink-0" />}
      {!model.ready && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDownload(model.key); }}
          disabled={downloading}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold transition-colors"
        >
          {downloading ? <Spinner size={11} /> : <Download size={11} />}
          Get
        </button>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

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
  // whisper setup
  const [whisperReady,  setWhisperReady]  = useState(false);
  const [setupLoading,  setSetupLoading]  = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupPhase,    setSetupPhase]    = useState('');

  // models
  const [models,         setModels]         = useState([]);
  const [selectedModel,  setSelectedModel]  = useState('base');
  const [downloadingModel, setDownloadingModel] = useState(null);
  const [modelProgress,  setModelProgress]  = useState(0);

  // file
  const [file,      setFile]      = useState(null);  // File object
  const [localPath, setLocalPath] = useState('');    // typed local path
  const [dragging,  setDragging]  = useState(false);
  const fileRef = useRef(null);

  // transcription
  const [language,  setLanguage]  = useState('auto');
  const [status,    setStatus]    = useState('idle'); // idle | loading | transcribing | done | error
  const [phase,     setPhase]     = useState('');
  const [progress,  setProgress]  = useState(0);
  const [result,    setResult]    = useState('');
  const [error,     setError]     = useState('');
  const esRef = useRef(null);

  // ── Setup check on mount ────────────────────────────────────────────────────
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

  // ── Install whisper.cpp ─────────────────────────────────────────────────────
  const runSetup = useCallback(() => {
    setSetupLoading(true);
    setSetupPhase('Connecting…');
    const es = new EventSource('/api/transcribe/setup');

    es.addEventListener('phase', (e) => {
      const d = JSON.parse(e.data);
      setSetupPhase(d.message || d.phase);
    });
    es.addEventListener('progress', (e) => {
      const d = JSON.parse(e.data);
      setSetupProgress(d.percent || 0);
    });
    es.addEventListener('done', (e) => {
      const d = JSON.parse(e.data);
      es.close();
      setSetupLoading(false);
      if (d.success) {
        setWhisperReady(true);
        setModels(d.models || []);
      } else {
        setError(d.message || 'Setup failed.');
      }
    });
    es.onerror = () => { es.close(); setSetupLoading(false); setError('Setup connection lost.'); };
  }, []);

  // ── Download a model ────────────────────────────────────────────────────────
  const downloadModel = useCallback((modelKey) => {
    setDownloadingModel(modelKey);
    setModelProgress(0);
    const es = new EventSource(`/api/transcribe/model/ensure?model=${modelKey}`);

    es.addEventListener('progress', (e) => {
      const d = JSON.parse(e.data);
      setModelProgress(d.percent || 0);
    });
    es.addEventListener('done', (e) => {
      const d = JSON.parse(e.data);
      es.close();
      setDownloadingModel(null);
      setModels(d.models || []);
      if (d.success) setSelectedModel(modelKey);
    });
    es.onerror = () => { es.close(); setDownloadingModel(null); };
  }, []);

  // ── File drop / select ──────────────────────────────────────────────────────
  const onFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (f) { setFile(f); setLocalPath(''); setResult(''); setError(''); }
  }, []);

  // ── Start transcription ─────────────────────────────────────────────────────
  const startTranscription = useCallback(async () => {
    setResult('');
    setError('');
    setProgress(0);

    if (file) {
      // Upload the file
      setStatus('loading');
      setPhase('Uploading file…');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', selectedModel);
      formData.append('language', language);

      try {
        // Use fetch with streaming to read SSE from POST
        const resp = await fetch('/api/transcribe/upload', { method: 'POST', body: formData });
        if (!resp.ok) {
          const d = await resp.json();
          throw new Error(d.error || 'Upload failed');
        }
        setStatus('transcribing');
        readSSEStream(resp.body);
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    } else if (localPath.trim()) {
      // Transcribe by path
      setStatus('transcribing');
      setPhase('Starting…');

      const resp = await fetch('/api/transcribe/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: localPath.trim(), model: selectedModel, language }),
      });

      if (!resp.ok) {
        const d = await resp.json();
        setStatus('error');
        setError(d.error || 'Failed to start transcription');
        return;
      }
      readSSEStream(resp.body);
    }
  }, [file, localPath, selectedModel, language]);

  // Read SSE from a ReadableStream (works for both GET EventSource and POST fetch)
  const readSSEStream = useCallback((stream) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let accumulated = '';

    const processLine = (line) => {
      if (!line.startsWith('data: ')) return;
      const raw = line.slice(6);
      let d;
      try { d = JSON.parse(raw); } catch { return; }

      // Re-use the same event names as the SSE backend emits
      if (d.phase !== undefined && d.message !== undefined) {
        setPhase(d.message);
        if (d.phase === 'done') { setStatus('done'); }
      }
      if (d.percent !== undefined) setProgress(d.percent);
      if (d.text !== undefined) accumulated += (accumulated ? ' ' : '') + d.text;
      if (d.success !== undefined) {
        // 'done' event
        if (d.success) {
          setStatus('done');
          if (d.text) setResult(d.text);
        } else {
          setStatus('error');
          setError(d.message || 'Transcription failed');
        }
      }
      if (d.text && d.success === undefined) {
        // 'chunk' event — partial streaming text
        setResult(accumulated);
      }
    };

    // identify SSE event type from event: line
    let currentEvent = '';

    const pump = () => {
      reader.read().then(({ done, value }) => {
        if (done) return;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            processLine(line);
          }
        }
        pump();
      }).catch(() => {});
    };
    pump();
  }, []);

  // ── Save .txt ───────────────────────────────────────────────────────────────
  const saveTxt = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const name = file ? file.name.replace(/\.[^.]+$/, '') : 'transcription';
    a.download = `${name}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const selectedFile = file?.name || (localPath ? localPath.split(/[\\/]/).pop() : '');
  const canTranscribe = whisperReady && (file || localPath.trim()) && models.find((m) => m.key === selectedModel)?.ready && status !== 'transcribing' && status !== 'loading';

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg mb-4">
          <FileText size={26} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Transcribe</h1>
        <p className="text-gray-500 mt-2">Convert audio &amp; video to text using Whisper AI — runs entirely on your computer</p>
      </div>

      {/* ── Setup card (shown when whisper not installed) ── */}
      {!whisperReady && (
        <div className="bg-white border border-amber-200 rounded-3xl p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800">whisper.cpp not installed</p>
              <p className="text-sm text-gray-500 mt-0.5">The transcription engine needs to be downloaded once (~25 MB).</p>
            </div>
          </div>
          {setupLoading ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">{setupPhase}</p>
              <ProgressBar percent={setupProgress} color="blue" />
            </div>
          ) : (
            <button
              type="button"
              onClick={runSetup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              <Download size={14} />
              Install whisper.cpp
            </button>
          )}
          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </div>
      )}

      {whisperReady && (
        <div className="space-y-5">

          {/* ── Model selection ── */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Whisper Model</h2>
              <button type="button" onClick={refreshModels} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                <RefreshCw size={13} />
              </button>
            </div>
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
                <p className="text-xs text-gray-500">Downloading {downloadingModel} model…</p>
                <ProgressBar percent={modelProgress} color="purple" />
              </div>
            )}
          </div>

          {/* ── File input ── */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Audio / Video File</h2>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${
                dragging
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
              }`}
            >
              <Upload size={24} className="text-gray-300" />
              <p className="text-sm text-gray-500">
                {selectedFile
                  ? <span className="text-purple-600 font-medium">{selectedFile}</span>
                  : 'Drop audio/video file here or click to browse'}
              </p>
              <p className="text-xs text-gray-400">MP3, MP4, WAV, M4A, OGG, FLAC, WEBM…</p>
              <input ref={fileRef} type="file" className="hidden" accept="audio/*,video/*" onChange={onFileDrop} />
            </div>

            {/* OR: local path */}
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1.5 text-center">or paste a local file path</p>
              <input
                type="text"
                value={localPath}
                onChange={(e) => { setLocalPath(e.target.value); setFile(null); setResult(''); setError(''); }}
                placeholder="C:\Users\…\video.mp4"
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-400 focus:bg-white transition-colors font-mono"
              />
            </div>

            {/* Language */}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="text-xs font-semibold text-gray-500">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-purple-400 transition-colors"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Transcribe button ── */}
          <button
            type="button"
            onClick={startTranscription}
            disabled={!canTranscribe}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 disabled:pointer-events-none text-white font-bold text-base shadow-sm transition-all duration-200"
          >
            {(status === 'loading' || status === 'transcribing') ? (
              <>
                <Spinner size={18} className="text-white" />
                {phase || 'Transcribing…'}
              </>
            ) : (
              <>
                <FileText size={18} />
                Transcribe
              </>
            )}
          </button>

          {/* ── Progress ── */}
          {(status === 'loading' || status === 'transcribing') && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">{phase}</p>
              <ProgressBar percent={progress} pulse={progress === 0} color="purple" />
            </div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Result ── */}
          {result && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {status === 'done' && <CheckCircle size={16} className="text-green-500" />}
                  <h2 className="text-sm font-bold text-gray-700">Transcription</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard?.writeText(result); }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={saveTxt}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                  >
                    <Download size={12} />
                    Save .txt
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={result}
                rows={10}
                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none resize-y leading-relaxed"
              />
              <p className="text-xs text-gray-400 mt-2">{result.split(/\s+/).filter(Boolean).length} words</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
