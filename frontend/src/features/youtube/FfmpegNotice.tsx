import { AlertCircle, Zap } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

export interface FfmpegNoticeProps {
  isFfmpegInstalled: boolean;
}

// shown under the quality grid when the chosen quality needs video and audio merged
export default function FfmpegNotice({ isFfmpegInstalled }: FfmpegNoticeProps) {
  if (!isFfmpegInstalled) {
    return (
      <Alert variant="default" className="mt-3 border-amber-200 bg-amber-50 py-2.5">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-xs text-amber-700">
          Qualities above 720p need FFmpeg to merge video and audio. Restart KineTube to run setup again, or pick 720p or lower.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="default" className="mt-3 border-green-200 bg-green-50 py-2.5">
      <Zap className="h-4 w-4 text-green-500" />
      <AlertDescription className="text-xs text-green-700">FFmpeg is installed, so video and audio are merged automatically.</AlertDescription>
    </Alert>
  );
}
