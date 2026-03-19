import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loginWithEmail } from '@digitalvirgo/drm-player';

const WORKER_BASE = import.meta.env.VITE_SMART_VIDEO_HOST?.replace('/smartvideo', '') ||
  'https://smartvideo-cors-proxy.matteoburgassi.workers.dev';

type Step = 'code' | 'login' | 'verifying' | 'done' | 'error';

export default function PairPage() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>(code ? 'login' : 'code');

  const handleCodeSubmit = useCallback(() => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Please enter a 6-character code');
      return;
    }
    setCode(trimmed);
    setError('');
    setStep('login');
  }, [code]);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setError('');
    setStep('verifying');

    try {
      const user = await loginWithEmail(email, password);

      const res = await fetch(`${WORKER_BASE}/device/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase(), user }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as any)?.error || 'Code expired or invalid');
      }

      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStep('login');
    }
  }, [email, password, code]);

  if (step === 'done') {
    return (
      <PageShell>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
            <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Paired successfully</h2>
          <p className="text-white/50">You can now close this page. Your TV should sign in automatically.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">Pair your TV</h1>
        <p className="mt-2 text-white/50">
          {step === 'code'
            ? 'Enter the code shown on your TV screen'
            : 'Sign in to link your account'}
        </p>
      </div>

      {step === 'code' && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/70">TV Code</label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoFocus
              className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-5 py-4 text-center text-2xl font-mono tracking-[0.3em] text-white placeholder-white/20 outline-none focus:border-white/40"
            />
          </div>
          {error && <ErrorBanner message={error} />}
          <button
            onClick={handleCodeSubmit}
            className="w-full rounded-xl bg-white py-4 text-lg font-semibold text-black transition-opacity hover:opacity-90"
          >
            Continue
          </button>
        </div>
      )}

      {(step === 'login' || step === 'verifying') && (
        <div className="space-y-4">
          <div className="mx-auto mb-2 w-fit rounded-lg bg-white/10 px-4 py-2 font-mono text-lg tracking-[0.2em] text-white/80">
            {code}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/70">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
              className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/30 outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-5 py-4 text-lg text-white placeholder-white/30 outline-none focus:border-white/40"
            />
          </div>
          {error && <ErrorBanner message={error} />}
          <button
            onClick={handleLogin}
            disabled={step === 'verifying'}
            className={`w-full rounded-xl bg-white py-4 text-lg font-semibold text-black transition-opacity hover:opacity-90 ${
              step === 'verifying' ? 'opacity-60' : ''
            }`}
          >
            {step === 'verifying' ? 'Signing in...' : 'Sign In & Pair'}
          </button>
          <button
            onClick={() => { setStep('code'); setError(''); }}
            className="w-full py-2 text-sm text-white/40 hover:text-white/60"
          >
            Enter a different code
          </button>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#120818] p-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}
