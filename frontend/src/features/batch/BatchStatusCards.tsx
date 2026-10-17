import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

export interface WaitingCardProps {
  url: string;
  isLoading: boolean;
}

export function WaitingCard({ url, isLoading }: WaitingCardProps) {
  return (
    <Card className="mb-3">
      <CardContent className="flex items-center gap-3 p-4">
        {isLoading ? <Spinner className="size-4 text-muted-foreground" /> : <Skeleton className="h-4 w-4 rounded-full" />}
        <span className="flex-1 truncate text-sm text-muted-foreground">{url}</span>
        <span className="flex-shrink-0 text-xs text-muted-foreground">{isLoading ? 'Reading...' : 'Waiting'}</span>
      </CardContent>
    </Card>
  );
}

export interface ErrorCardProps {
  url: string;
  message: string;
}

export function ErrorCard({ url, message }: ErrorCardProps) {
  return (
    <Alert variant="destructive" className="mb-3">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <p className="mb-0.5 truncate text-xs font-medium">{url}</p>
        <p className="text-xs">{message}</p>
      </AlertDescription>
    </Alert>
  );
}
