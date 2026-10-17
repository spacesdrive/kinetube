import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormError from './FormError';

import type { FormEvent } from 'react';

export interface TwoFactorFormProps {
  isSending: boolean;
  error: string;
  onSubmit(code: string): void;
  onBack(): void;
}

// six digits from an authenticator or text message, or an eight digit backup code
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 8;

export default function TwoFactorForm({ isSending, error, onSubmit, onBack }: TwoFactorFormProps) {
  const [code, setCode] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(code);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">Enter the code Instagram sent to your phone or email.</p>
      <div className="space-y-1.5">
        <Label htmlFor="ig-2fa" className="text-xs">Verification code</Label>
        <Input
          id="ig-2fa"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, MAX_CODE_LENGTH))}
          placeholder="123456"
          inputMode="numeric"
          autoFocus
          className="text-center font-mono text-xl tracking-widest"
        />
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={isSending || code.length < MIN_CODE_LENGTH} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
        {isSending ? 'Checking the code...' : 'Verify'}
      </Button>
      <Button type="button" variant="ghost" className="w-full text-sm" onClick={onBack}>Back to login</Button>
    </form>
  );
}
