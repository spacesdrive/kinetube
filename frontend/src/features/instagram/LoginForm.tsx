import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import FormError from './FormError';

import type { FormEvent } from 'react';

export interface LoginFormProps {
  username: string;
  isSending: boolean;
  error: string;
  onUsernameChange(username: string): void;
  onSubmit(password: string): void;
}

export default function LoginForm({ username, isSending, error, onUsernameChange, onSubmit }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [isPasswordShown, setIsPasswordShown] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(password);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ig-username" className="text-[13px] text-ink-muted">Username</Label>
        <Input id="ig-username" value={username} onChange={(event) => onUsernameChange(event.target.value)} placeholder="your_username" autoComplete="username" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ig-password" className="text-[13px] text-ink-muted">Password</Label>
        <div className="relative">
          <Input
            id="ig-password"
            type={isPasswordShown ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="pr-10"
          />
          <button
            type="button"
            aria-label={isPasswordShown ? 'Hide password' : 'Show password'}
            onClick={() => setIsPasswordShown((isShown) => !isShown)}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-pill text-ink-faint transition-quiet hover:bg-surface-hover hover:text-ink"
          >
            {isPasswordShown ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={isSending} className="w-full">
        {isSending ? <><Spinner className="size-4" /> Logging in...</> : 'Log in'}
      </Button>
    </form>
  );
}
