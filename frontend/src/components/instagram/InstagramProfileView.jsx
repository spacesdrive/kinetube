import { useState, useMemo } from 'react';
import { Download, Search, User, Play, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
  const [selected, setSelected]           = useState(new Set());
  const [transcribeIds, setTranscribeIds] = useState(new Set());
  const [search, setSearch]               = useState('');
  const [quality, setQuality]             = useState('best');

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

  const selectedItems    = info.entries.filter((e) => selected.has(e.id));
  const transcribeCount  = selectedItems.filter((e) => transcribeIds.has(e.id)).length;
  const withTranscribe   = (items) => items.map((e) => ({ ...e, transcribe: transcribeIds.has(e.id) }));

  const handleBulkDownload   = () => { if (selectedItems.length === 0) return; onBulkDownload({ videos: withTranscribe(selectedItems), quality, account }); };
  const handleSingleDownload = (entry, e) => { e?.stopPropagation(); onDownload({ url: entry.url, quality, title: entry.title, account, transcribe: transcribeIds.has(entry.id) }); };

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 animate-fade-slide-up" style={{ animationFillMode: 'both' }}>
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6 px-1">
        <Avatar className="w-14 h-14 ring-2 ring-pink-200 dark:ring-pink-900">
          {info.avatar && <AvatarImage src={proxyUrl(info.avatar)} alt={info.channelName} />}
          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
            <User size={24} />
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">@{info.username}</h2>
          <p className="text-sm text-muted-foreground">
            {info.postCount} posts
            {info.truncated && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-200 dark:border-amber-800">first 500 shown</Badge>}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter posts..."
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={quality} onValueChange={setQuality}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="best">Best Quality</SelectItem>
            <SelectItem value="1080p">1080p</SelectItem>
            <SelectItem value="720p">720p</SelectItem>
            <SelectItem value="480p">480p</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={toggleAll} className="h-9 gap-1.5">
          <Checkbox checked={allSelected} className="w-3.5 h-3.5 pointer-events-none" />
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>

        {transcribeCount > 0 && (
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-purple-600 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
            <Mic size={11} /> {transcribeCount} to transcribe
          </Badge>
        )}

        <Button
          onClick={handleBulkDownload}
          disabled={selectedItems.length === 0}
          size="sm"
          className="h-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
        >
          <Download size={13} className="mr-1.5" />
          Download {selectedItems.length > 0 ? `(${selectedItems.length})` : 'Selected'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3 px-1 flex items-center gap-1">
        <MicOff size={11} /> Click the mic icon on any post to generate a transcript when it downloads.
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? 'No posts match your search.' : 'No posts found for this profile.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((entry) => {
            const isSelected   = selected.has(entry.id);
            const isTranscribe = transcribeIds.has(entry.id);
            return (
              <div
                key={entry.id}
                className={cn(
                  'group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 cursor-pointer',
                  isSelected
                    ? 'border-purple-400 shadow-sm ring-1 ring-purple-300 dark:ring-purple-800'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                {/* Selection checkbox */}
                <button
                  type="button"
                  onClick={() => toggleItem(entry.id)}
                  className="absolute top-2 left-2 z-10"
                >
                  {isSelected ? (
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 shadow">
                      <svg viewBox="0 0 12 12" className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-background/80 border border-border backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                  )}
                </button>

                {/* Transcribe toggle */}
                <button
                  type="button"
                  onClick={(e) => toggleTranscribe(entry.id, e)}
                  className={cn(
                    'absolute top-2 right-2 z-10 p-1 rounded-md transition-colors',
                    isTranscribe
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-background/80 text-muted-foreground border border-border backdrop-blur-sm opacity-0 group-hover:opacity-100'
                  )}
                  title={isTranscribe ? 'Transcription on — click to disable' : 'Click to transcribe after download'}
                >
                  {isTranscribe ? <Mic size={11} /> : <MicOff size={11} />}
                </button>

                {/* Thumbnail */}
                <div className="relative aspect-square bg-muted overflow-hidden" onClick={() => toggleItem(entry.id)}>
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
                  <div className={cn('w-full h-full flex items-center justify-center', entry.thumbnail ? 'hidden' : '')}>
                    <Play size={24} className="text-muted-foreground/30" />
                  </div>
                  {entry.duration && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-black/60 text-white rounded-md">
                      {fmtDuration(entry.duration)}
                    </span>
                  )}
                </div>

                {/* Caption + actions */}
                <div className="p-2.5">
                  <p className="text-xs text-foreground line-clamp-2 leading-relaxed mb-1">
                    {entry.title || 'Untitled'}
                  </p>
                  {entry.viewCount && (
                    <p className="text-[10px] text-muted-foreground mb-2">{fmtNum(entry.viewCount)}</p>
                  )}
                  <Button
                    size="sm"
                    className="w-full h-7 text-[11px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                    onClick={(e) => handleSingleDownload(entry, e)}
                  >
                    <Download size={11} className="mr-1" />
                    {isTranscribe ? 'Download + Transcript' : 'Download'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
