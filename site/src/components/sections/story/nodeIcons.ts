import type { ComponentType } from 'react';
import { AudioLines, Download, Film, FileText, FolderDown, Laptop, Pause, Users } from 'lucide-react';

// the icon beside each ring node, also used by the chip grid on narrow screens
export const NODE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  ytdlp: Download,
  instaloader: Users,
  ffmpeg: Film,
  whisper: AudioLines,
  resume: Pause,
  transcripts: FileText,
  folder: FolderDown,
  computer: Laptop,
};
