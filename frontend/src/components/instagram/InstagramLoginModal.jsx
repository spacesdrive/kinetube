import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ShieldCheck, AlertTriangle, Download, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function InstagramLoginModal({ onClose, onSuccess }) {
  const [step, setStep]         = useState('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [setupStatus, setSetupStatus] = useState('checking');
  const [installLog, setInstallLog]   = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => { checkSetup(); }, []);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [installLog]);

  async function checkSetup() {
    setSetupStatus('checking');
    try {
      const res  = await fetch('/api/instagram/setup/python/check');
      const data = await res.json();
      if (!data.pythonFound)           setSetupStatus('no_python');
      else if (!data.instaloaderReady) setSetupStatus('needs_install');
      else                             setSetupStatus('ready');
    } catch {
      setSetupStatus('ready');
    }
  }

  async function runInstall() {
    setSetupStatus('installing');
    setInstallLog([]);
    const es = new EventSource('/api/instagram/setup/instaloader');
    es.addEventListener('log',  (e) => { const { line } = JSON.parse(e.data); setInstallLog((prev) => [...prev, line]); });
    es.addEventListener('done', (e) => { es.close(); const { success } = JSON.parse(e.data); setSetupStatus(success ? 'ready' : 'install_failed'); });
    es.onerror = () => { es.close(); setSetupStatus('install_failed'); };
  }

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Enter both username and password.'); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/instagram/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if      (data.status === 'success')        onSuccess(username.trim());
      else if (data.status === 'twofa_required') setStep('twofa');
      else    setError(data.message || 'Login failed.');
    } catch { setError('Network error. Is the backend running?'); }
    finally  { setLoading(false); }
  };

  const handle2FA = async (e) => {
    e?.preventDefault();
    if (!code.trim()) { setError('Enter the verification code.'); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/instagram/login/2fa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') onSuccess(username.trim());
      else setError(data.message || 'Invalid code.');
    } catch { setError('Network error.'); }
    finally  { setLoading(false); }
  };

  const isReady = setupStatus === 'ready';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center items-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-pink-200 mb-1">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
          <DialogTitle>Instagram Account</DialogTitle>
          {isReady && (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
              <CheckCircle2 size={11} /> Ready
            </Badge>
          )}
          <DialogDescription className="sr-only">Log in to your Instagram account</DialogDescription>
        </DialogHeader>

        {/* Setup gate */}
        {!isReady && (
          <div className="space-y-4">
            {setupStatus === 'checking' && (
              <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
                <Loader2 size={22} className="animate-spin text-purple-500" />
                <span className="text-sm">Checking setup…</span>
              </div>
            )}

            {setupStatus === 'no_python' && (
              <div className="space-y-4">
                <Alert variant="default" className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-xs text-amber-700">
                    <p className="font-semibold mb-1">Python not found</p>
                    Instagram login requires Python. Install it from{' '}
                    <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="underline font-medium">python.org</a>
                    {' '}(check "Add to PATH"), then click Check Again.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" onClick={checkSetup}>Check Again</Button>
              </div>
            )}

            {setupStatus === 'needs_install' && (
              <div className="space-y-4">
                <Alert variant="default" className="border-purple-200 bg-purple-50">
                  <AlertDescription className="text-xs text-purple-700">
                    <p className="font-semibold mb-1">One-time setup</p>
                    Python is installed. KineTube needs the{' '}
                    <code className="bg-purple-100 px-1 rounded">instaloader</code>{' '}
                    library — click below to install it automatically.
                  </AlertDescription>
                </Alert>
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  onClick={runInstall}
                >
                  <Download size={14} className="mr-2" /> Install Automatically
                </Button>
              </div>
            )}

            {setupStatus === 'installing' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Loader2 size={16} className="animate-spin text-purple-500" />
                  Installing instaloader…
                </div>
                <ScrollArea className="h-36 w-full rounded-xl bg-gray-900 p-3">
                  <div className="text-xs font-mono text-green-400 space-y-0.5">
                    {installLog.length === 0
                      ? <span className="text-gray-500">Starting pip…</span>
                      : installLog.map((line, i) => <div key={i}>{line}</div>)
                    }
                    <div ref={logEndRef} />
                  </div>
                </ScrollArea>
              </div>
            )}

            {setupStatus === 'install_failed' && (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <p className="font-semibold mb-1">Installation failed</p>
                    Try running{' '}
                    <code className="bg-red-100 px-1 rounded">pip install instaloader</code>{' '}
                    in a terminal, then click Check Again.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    onClick={runInstall}
                  >
                    Retry
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={checkSetup}>Check Again</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Login form */}
        {isReady && step === 'credentials' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ig-username" className="text-xs">Username</Label>
              <Input
                id="ig-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ig-password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="ig-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs break-words">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Logging in…</> : 'Log In'}
            </Button>
          </form>
        )}

        {/* 2FA step */}
        {isReady && step === 'twofa' && (
          <form onSubmit={handle2FA} className="space-y-3">
            <p className="text-sm text-center text-muted-foreground">
              Enter the code sent to your phone or email.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="ig-2fa" className="text-xs">Verification Code</Label>
              <Input
                id="ig-2fa"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="123456"
                inputMode="numeric"
                autoFocus
                className="text-center text-xl font-mono tracking-widest"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
            >
              Back to login
            </Button>
          </form>
        )}

        <Separator />

        <div className="flex items-start gap-2 p-3 bg-muted rounded-xl text-xs text-muted-foreground">
          <ShieldCheck size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
          Credentials are sent only to your local backend and session is saved locally.
        </div>
      </DialogContent>
    </Dialog>
  );
}
