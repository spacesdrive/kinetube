import { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, ShieldCheck, AlertTriangle, Download, CheckCircle2, Loader2 } from 'lucide-react';

export default function InstagramLoginModal({ onClose, onSuccess }) {
  const [step, setStep]         = useState('credentials'); // 'credentials' | 'twofa'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Setup / auto-install state
  const [setupStatus, setSetupStatus] = useState('checking');
  // 'checking' | 'no_python' | 'needs_install' | 'installing' | 'install_failed' | 'ready'
  const [installLog, setInstallLog]   = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => { checkSetup(); }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [installLog]);

  async function checkSetup() {
    setSetupStatus('checking');
    try {
      const res  = await fetch('/api/instagram/setup/python/check');
      const data = await res.json();
      if (!data.pythonFound)           setSetupStatus('no_python');
      else if (!data.instaloaderReady) setSetupStatus('needs_install');
      else                             setSetupStatus('ready');
    } catch {
      setSetupStatus('ready'); // backend unreachable — don't block UI
    }
  }

  async function runInstall() {
    setSetupStatus('installing');
    setInstallLog([]);
    const es = new EventSource('/api/instagram/setup/instaloader');
    es.addEventListener('log',  (e) => {
      const { line } = JSON.parse(e.data);
      setInstallLog((prev) => [...prev, line]);
    });
    es.addEventListener('done', (e) => {
      es.close();
      const { success } = JSON.parse(e.data);
      setSetupStatus(success ? 'ready' : 'install_failed');
    });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-scale-in">
        <button onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-pink-200 mb-3">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">Instagram Account</h2>
          {isReady && (
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-50 rounded-full text-xs text-green-600 font-medium">
              <CheckCircle2 size={11} /> Ready
            </div>
          )}
        </div>

        {/* ── Setup gate ── */}
        {!isReady && (
          <div className="mb-4">
            {setupStatus === 'checking' && (
              <div className="flex flex-col items-center gap-3 py-6 text-gray-500">
                <Loader2 size={22} className="animate-spin text-purple-500" />
                <span className="text-sm">Checking setup…</span>
              </div>
            )}

            {setupStatus === 'no_python' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Python not found
                  </p>
                  <p className="text-xs text-amber-600">
                    Instagram login requires Python. Install it from{' '}
                    <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer"
                       className="underline font-medium">python.org</a>
                    {' '}(check "Add to PATH"), then click Check Again.
                  </p>
                </div>
                <button onClick={checkSetup}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Check Again
                </button>
              </div>
            )}

            {setupStatus === 'needs_install' && (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-1.5">
                  <p className="text-sm font-semibold text-purple-700">One-time setup</p>
                  <p className="text-xs text-purple-600">
                    Python is installed. KineTube needs the <code className="bg-purple-100 px-1 rounded">instaloader</code> library — click below to install it automatically.
                  </p>
                </div>
                <button onClick={runInstall}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <Download size={14} /> Install Automatically
                </button>
              </div>
            )}

            {setupStatus === 'installing' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Loader2 size={16} className="animate-spin text-purple-500" />
                  Installing instaloader…
                </div>
                <div className="bg-gray-900 rounded-xl p-3 h-36 overflow-y-auto text-xs font-mono text-green-400 space-y-0.5">
                  {installLog.length === 0
                    ? <span className="text-gray-500">Starting pip…</span>
                    : installLog.map((line, i) => <div key={i}>{line}</div>)
                  }
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {setupStatus === 'install_failed' && (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 space-y-1.5">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Installation failed
                  </p>
                  <p className="text-xs text-red-600">
                    Try running <code className="bg-red-100 px-1 rounded">pip install instaloader</code> in a terminal, then click Check Again.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={runInstall}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm">
                    Retry
                  </button>
                  <button onClick={checkSetup}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
                    Check Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Login form (only when ready) ── */}
        {isReady && step === 'credentials' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username" autoComplete="username"
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white transition-colors" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl text-xs text-red-600">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60">
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Logging in…</span>
                : 'Log In'}
            </button>
          </form>
        )}

        {/* ── 2FA step ── */}
        {isReady && step === 'twofa' && (
          <form onSubmit={handle2FA} className="space-y-3">
            <p className="text-sm text-center text-gray-600 mb-1">
              Enter the code sent to your phone or email.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Verification Code</label>
              <input type="text" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="123456" inputMode="numeric" autoFocus
                className="w-full px-3 py-2.5 text-center text-xl font-mono tracking-widest bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-purple-400 focus:bg-white transition-colors" />
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl text-xs text-red-600">
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || code.length < 6}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60">
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Back to login
            </button>
          </form>
        )}

        {/* Privacy note */}
        <div className="flex items-start gap-2 mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
          <ShieldCheck size={13} className="text-green-500 flex-shrink-0 mt-0.5" />
          Credentials are sent only to your local backend and session is saved locally.
        </div>
      </div>
    </div>
  );
}
