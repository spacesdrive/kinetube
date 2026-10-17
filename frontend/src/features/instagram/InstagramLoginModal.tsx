import { CheckCircle2, ShieldCheck } from 'lucide-react';

import { InstagramIcon } from '@/components/icons/BrandIcons';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
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
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-pink-200">
            <InstagramIcon className="h-6 w-6" />
          </div>
          <DialogTitle>Instagram account</DialogTitle>
          {isReady && <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-600"><CheckCircle2 size={11} /> Ready</Badge>}
          <DialogDescription className="sr-only">Log in to an Instagram account</DialogDescription>
        </DialogHeader>

        {!isReady && <InstaloaderSetup setup={setup} />}
        {isReady && login.step === 'credentials' && (
          <LoginForm
            username={login.username}
            isSending={login.isSending}
            error={login.error}
            onUsernameChange={login.setUsername}
            onSubmit={login.submitCredentials}
          />
        )}
        {isReady && login.step === 'twoFactor' && (
          <TwoFactorForm isSending={login.isSending} error={login.error} onSubmit={login.submitCode} onBack={login.goBack} />
        )}

        <Separator />
        <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <ShieldCheck size={13} className="mt-0.5 flex-shrink-0 text-green-500" />
          Your password goes only to KineTube on this computer, and the login session is saved here too.
        </div>
      </DialogContent>
    </Dialog>
  );
}
