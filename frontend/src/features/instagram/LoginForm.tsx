import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="ig-username" className="text-xs">Username</Label>
        <Input id="ig-username" value={username} onChange={(event) => onUsernameChange(event.target.value)} placeholder="your_username" autoComplete="username" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ig-password" className="text-xs">Password</Label>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {isPasswordShown ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={isSending} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
        {isSending ? <><Loader2 size={14} className="mr-2 animate-spin" /> Logging in...</> : 'Log in'}
      </Button>
    </form>
  );
}
