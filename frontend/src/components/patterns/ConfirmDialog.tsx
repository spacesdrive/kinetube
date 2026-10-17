import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HoldToConfirmButton from './HoldToConfirmButton';

export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  // a destructive action asks for a hold instead of a click
  isDestructive?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export default function ConfirmDialog({ title, description, confirmLabel, isDestructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          {isDestructive ? (
            <HoldToConfirmButton label={confirmLabel} icon={<Trash2 />} onConfirm={onConfirm} />
          ) : (
            <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
