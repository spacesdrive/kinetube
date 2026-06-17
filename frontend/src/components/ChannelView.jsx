import { useState, useMemo } from 'react';
import {
  Download, Music, Play, Eye, Calendar, Search, Video, Zap, Mic, MicOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const VIDEO_QUALITIES = ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p'];
const QUALITY_LABELS = {
  best: 'Best Available',
  '2160p': '4K (2160p)',
  '1440p': '2K (1440p)',
  '1080p': '1080p Full HD',
  '720p': '720p HD',
  '480p': '480p SD',
  '360p': '360p',
};

function formatNumber(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(uploadDate) {
  if (!uploadDate) return null;
  const s = uploadDate.toString();
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function VideoCard({ video, selected, transcribe, onToggle, onTranscribeToggle, onDownload }) {
  return (
    <div
      className={cn(
        'relative flex gap-3 p-3 rounded-2xl border transition-all cursor-pointer group',
        selected ? 'border-blue-300 bg-blue-50/60' : 'border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm'
      )}
      onClick={() => onToggle(video.id)}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(video.id)}
          className={selected ? 'border-blue-500 data-[state=checked]:bg-blue-500' : ''}
        />
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 relative w-28 h-16 rounded-xl overflow-hidden bg-muted">
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
        {video.durationString && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 py-0.5 rounded">
            {video.durationString}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold line-clamp-2 leading-snug">{video.title}</p>
        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
          {formatNumber(video.viewCount) && (
            <span className="flex items-center gap-1"><Eye size={11} /> {formatNumber(video.viewCount)}</span>
          )}
          {formatDate(video.uploadDate) && (
            <span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(video.uploadDate)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 self-center flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', transcribe ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'text-muted-foreground/40 hover:text-muted-foreground')}
                onClick={() => onTranscribeToggle(video.id)}
              >
                {transcribe ? <Mic size={14} /> : <MicOff size={14} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {transcribe ? 'Transcription on — click to disable' : 'Click to transcribe after download'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Download size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Quality</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {VIDEO_QUALITIES.map((q) => (
              <DropdownMenuItem
                key={q}
                onClick={() => onDownload({ videos: [{ ...video, transcribe }], quality: q, audioOnly: false })}
              >
                <Play size={12} className="mr-2" />
                {QUALITY_LABELS[q]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDownload({ videos: [{ ...video, transcribe: false }], quality: 'best', audioOnly: true })}
              className="text-purple-600"
            >
              <Music size={12} className="mr-2" />
              Audio Only (MP3)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function ChannelView({ info, ffmpegAvailable, onDownload }) {
  const [selected, setSelected]         = useState(new Set());
  const [transcribeIds, setTranscribeIds] = useState(new Set());
  const [search, setSearch]             = useState('');
  const [bulkQuality, setBulkQuality]   = useState('best');

  const filtered = useMemo(() => {
    if (!search.trim()) return info.entries;
    const q = search.toLowerCase();
    return info.entries.filter((v) => v.title?.toLowerCase().includes(q));
  }, [info.entries, search]);

  const allSelected  = filtered.length > 0 && filtered.every((v) => selected.has(v.id));
  const someSelected = filtered.some((v) => selected.has(v.id));

  const toggleVideo = (id) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleTranscribe = (id) =>
    setTranscribeIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((v) => n.delete(v.id)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); filtered.forEach((v) => n.add(v.id)); return n; });
    }
  };

  const selectedVideos  = info.entries.filter((v) => selected.has(v.id));
  const downloadTarget  = selectedVideos.length > 0 ? selectedVideos : filtered;
  const downloadCount   = downloadTarget.length;
  const transcribeCount = downloadTarget.filter((v) => transcribeIds.has(v.id)).length;
  const withTranscribe  = (vids) => vids.map((v) => ({ ...v, transcribe: transcribeIds.has(v.id) }));

  const isChannelShorts = info.type === 'channel_shorts';

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {/* Channel header */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            {info.avatar && (
              <img
                src={`/api/proxy/img?url=${encodeURIComponent(info.avatar)}`}
                alt={info.channelName}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0 bg-muted"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{info.channelName}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                {isChannelShorts ? (
                  <span className="flex items-center gap-1"><Zap size={14} className="text-amber-500" /> Shorts channel</span>
                ) : (
                  <span className="flex items-center gap-1"><Video size={14} /> Videos</span>
                )}
                <span className="flex items-center gap-1">
                  <Play size={14} /> {info.videoCount} {isChannelShorts ? 'shorts' : 'videos'} found
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk actions toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm" onClick={toggleAll} className="gap-2">
                <Checkbox
                  checked={allSelected}
                  className={allSelected ? 'border-blue-500 data-[state=checked]:bg-blue-500' : ''}
                  onCheckedChange={toggleAll}
                />
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>

              {someSelected && (
                <Badge variant="secondary" className="text-blue-600 bg-blue-100">
                  {selectedVideos.length} selected
                </Badge>
              )}
              {transcribeCount > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-purple-600 font-medium">
                  <Mic size={13} /> {transcribeCount} to transcribe
                </span>
              )}

              <div className="flex-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {QUALITY_LABELS[bulkQuality]}
                    <svg className="h-3.5 w-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {VIDEO_QUALITIES.map((q) => (
                    <DropdownMenuItem key={q} onClick={() => setBulkQuality(q)}>
                      {QUALITY_LABELS[q]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" onClick={() => onDownload({ videos: withTranscribe(downloadTarget), quality: bulkQuality, audioOnly: false })}>
                <Download size={15} className="mr-1.5" />
                Download {downloadCount} Video{downloadCount !== 1 ? 's' : ''}
              </Button>

              <Button size="sm" variant="secondary" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => onDownload({ videos: downloadTarget.map((v) => ({ ...v, transcribe: false })), quality: 'best', audioOnly: true })}>
                <Music size={15} className="mr-1.5" />
                {downloadCount} Audio (MP3)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${isChannelShorts ? 'shorts' : 'videos'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-2xl"
          />
        </div>

        <p className="text-xs text-muted-foreground px-1 flex items-center gap-1">
          <MicOff size={11} /> Click the mic icon on a video to include a text transcript when it downloads.
        </p>

        {/* Video list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search size={32} className="mx-auto mb-3 opacity-40" />
              <p>No results found for "{search}"</p>
            </div>
          ) : (
            filtered.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                selected={selected.has(video.id)}
                transcribe={transcribeIds.has(video.id)}
                onToggle={toggleVideo}
                onTranscribeToggle={toggleTranscribe}
                onDownload={onDownload}
              />
            ))
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
