import { useState, useMemo } from 'react';
import { Download, Search, CheckSquare, Square, User, Play, Mic, MicOff } from 'lucide-react';

function proxyUrl(url) {
  if (!url) return null;
  return `/api/proxy/img?url=${encodeURIComponent(url)}`;
}

function fmtDuration(s) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtNum(n) {
  if (!n) return '';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M views`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K views`;
  return `${n} views`;
}

export default function InstagramProfileView({ info, account, onDownload, onBulkDownload }) {
  const [selected, setSelected]         = useState(new Set());
  const [transcribeIds, setTranscribeIds] = useState(new Set());
  const [search, setSearch]             = useState('');
  const [quality, setQuality]           = useState('best');

  const filtered = useMemo(() => {
    if (!search.trim()) return info.entries;
    const q = search.toLowerCase();
    return info.entries.filter((e) => e.title.toLowerCase().includes(q));
  }, [info.entries, search]);

  const allSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((e) => next.delete(e.id));
      else filtered.forEach((e) => next.add(e.id));
      return next;
    });
  };

  const toggleItem = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTranscribe = (id, e) => {
    e?.stopPropagation();
    setTranscribeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItems = info.entries.filter((e) => selected.has(e.id));
  const transcribeCount = selectedItems.filter((e) => transcribeIds.has(e.id)).length;

  const withTranscribe = (items) => items.map((e) => ({ ...e, transcribe: transcribeIds.has(e.id) }));

  const handleBulkDownload = () => {
    if (selectedItems.length === 0) return;
    onBulkDownload({ videos: withTranscribe(selectedItems), quality, account });
  };

  const handleSingleDownload = (entry, e) => {
    e?.stopPropagation();
    onDownload({ url: entry.url, quality, title: entry.title, account, transcribe: transcribeIds.has(entry.id) });
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 animate-fade-slide-up" style={{ animationFillMode: 'both' }}>
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6 px-1">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {info.avatar ? (
            <img src={proxyUrl(info.avatar)} alt={info.channelName} className="w-full h-full object-cover" />
          ) : (
            <User size={24} className="text-white" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">@{info.username}</h2>
          <p className="text-sm text-gray-500">
            {info.postCount} posts
            {info.truncated && <span className="text-amber-500 ml-1">(first 500 shown)</span>}
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter posts..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-purple-400 transition-colors"
          />
        </div>

        {/* Quality */}
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-purple-400 transition-colors"
        >
          <option value="best">Best Quality</option>
          <option value="1080p">1080p</option>
          <option value="720p">720p</option>
          <option value="480p">480p</option>
        </select>

        {/* Select all */}
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {allSelected ? <CheckSquare size={14} className="text-purple-500" /> : <Square size={14} />}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>

        {/* Transcribe count badge */}
        {transcribeCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-100 rounded-xl">
            <Mic size={13} /> {transcribeCount} to transcribe
          </span>
        )}

        {/* Bulk download */}
        <button
          type="button"
          onClick={handleBulkDownload}
          disabled={selectedItems.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download size={14} />
          Download {selectedItems.length > 0 ? `(${selectedItems.length})` : 'Selected'}
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3 px-1 flex items-center gap-1">
        <MicOff size={11} /> Click the mic icon on any post to generate a transcript when it downloads.
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {search ? 'No posts match your search.' : 'No posts found for this profile.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((entry) => {
            const isSelected  = selected.has(entry.id);
            const isTranscribe = transcribeIds.has(entry.id);
            return (
              <div
                key={entry.id}
                className={`group relative bg-white rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer ${
                  isSelected ? 'border-purple-400 shadow-sm shadow-purple-100' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                {/* Selection checkbox */}
                <button
                  type="button"
                  onClick={() => toggleItem(entry.id)}
                  className="absolute top-2 left-2 z-10"
                >
                  {isSelected ? (
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 shadow">
                      <svg viewBox="0 0 12 12" fill="white" className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/80 border border-gray-300 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                  )}
                </button>

                {/* Transcribe toggle */}
                <button
                  type="button"
                  onClick={(e) => toggleTranscribe(entry.id, e)}
                  className={`absolute top-2 right-2 z-10 p-1 rounded-md transition-colors ${
                    isTranscribe
                      ? 'bg-purple-500 text-white shadow'
                      : 'bg-white/80 text-gray-400 border border-gray-200 backdrop-blur-sm opacity-0 group-hover:opacity-100'
                  }`}
                  title={isTranscribe ? 'Transcription on — click to disable' : 'Click to transcribe after download'}
                >
                  {isTranscribe ? <Mic size={11} /> : <MicOff size={11} />}
                </button>

                {/* Thumbnail */}
                <div
                  className="relative aspect-square bg-gray-100 overflow-hidden"
                  onClick={() => toggleItem(entry.id)}
                >
                  {entry.thumbnail ? (
                    <img
                      src={proxyUrl(entry.thumbnail)}
                      alt={entry.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${entry.thumbnail ? 'hidden' : ''}`}>
                    <Play size={24} className="text-gray-300" />
                  </div>
                  {entry.duration && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-black/60 text-white rounded-md">
                      {fmtDuration(entry.duration)}
                    </span>
                  )}
                </div>

                {/* Caption + actions */}
                <div className="p-2.5">
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-1.5">
                    {entry.title || 'Untitled'}
                  </p>
                  {entry.viewCount && (
                    <p className="text-[10px] text-gray-400">{fmtNum(entry.viewCount)}</p>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleSingleDownload(entry, e)}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-150 shadow-sm"
                  >
                    <Download size={11} />
                    {isTranscribe ? 'Download + Transcript' : 'Download'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
