import { ShieldCheck } from 'lucide-react';

import { InstagramIcon } from '@/components/icons/BrandIcons';
import StatusBadge from '@/components/patterns/StatusBadge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InstaloaderSetup from './InstaloaderSetup';
import LoginForm from './LoginForm';
import TwoFactorForm from './TwoFactorForm';
import { useInstagramLogin } from './useInstagramLogin';
import { useInstaloaderSetup } from './useInstaloaderSetup';

export interface InstagramLoginModalProps {
  onClose(): void;
  onLoggedIn(username: string): void;
}

export default function InstagramLoginModal({ onClose, onLoggedIn }: InstagramLoginModalProps) {
  const setup = useInstaloaderSetup();
  const login = useInstagramLogin(onLoggedIn);
  const isReady = setup.status === 'ready';

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-start">
          <span className="mb-1 flex size-10 items-center justify-center rounded-pill bg-surface text-ink"><InstagramIcon className="size-5" /></span>
          <div className="flex items-center gap-2">
            <DialogTitle>Log in to Instagram</DialogTitle>
            {isReady && <StatusBadge tone="success">Ready</StatusBadge>}
          </div>
          <DialogDescription>A saved login helps profiles load. Posts and reels download without one.</DialogDescription>
        </DialogHeader>

        {!isReady && <InstaloaderSetup setup={setup} />}
        {isReady && login.step === 'credentials' && (
          <LoginForm username={login.username} isSending={login.isSending} error={login.error} onUsernameChange={login.setUsername} onSubmit={login.submitCredentials} />
        )}
        {isReady && login.step === 'twoFactor' && (
          <TwoFactorForm isSending={login.isSending} error={login.error} onSubmit={login.submitCode} onBack={login.goBack} />
        )}

        <p className="flex items-start gap-2 border-t border-divider pt-4 text-xs text-ink-muted">
          <ShieldCheck size={14} className="mt-px flex-shrink-0 text-success" />
          Your password goes only to kinetube on this computer, and the login session is saved here too.
        </p>
      </DialogContent>
    </Dialog>
  );
}
