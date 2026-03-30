import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useAuth } from '../contexts/AuthContext';
import { loginWithEmail, requestDeviceCode, pollDeviceCode, PAIR_URL_BASE, POLL_INTERVAL } from 'tv-vod-auth';
import QRCode from '../components/QRCode';
import { isTV } from '../utils/platformInit';

const tv = isTV();

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string })?.returnTo ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [codeExpired, setCodeExpired] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { ref, focusKey } = useFocusable({
    focusKey: 'login-page',
    isFocusBoundary: true,
    trackChildren: true,
  });

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (expiryRef.current) { clearTimeout(expiryRef.current); expiryRef.current = null; }
  }, []);

  const requestCode = useCallback(async () => {
    stopPolling();
    setCodeExpired(false);
    setDeviceCode(null);
    setError('');

    try {
      const data = await requestDeviceCode();
      setDeviceCode(data.code);

      expiryRef.current = setTimeout(() => {
        stopPolling();
        setCodeExpired(true);
      }, data.expiresIn * 1000);

      pollRef.current = setInterval(async () => {
        try {
          const pollData = await pollDeviceCode(data.code);
          if (pollData.status === 'complete' && pollData.user) {
            stopPolling();
            login(pollData.user as any);
            navigate(returnTo, { replace: true, state: { loginSuccess: true } });
          } else if (pollData.status === 'expired') {
            stopPolling();
            setCodeExpired(true);
          }
        } catch { /* ignore poll errors */ }
      }, POLL_INTERVAL);
    } catch (err: any) {
      console.error('Device code request failed:', err);
      setError(err?.message || 'Could not generate pairing code. Try again.');
    }
  }, [stopPolling, login, navigate, returnTo]);

  useEffect(() => {
    if (tv) {
      requestCode();
    }
    return stopPolling;
  }, []);

  useEffect(() => {
    if (tv) {
      setFocus('login-refresh');
    } else {
      setFocus('login-email');
    }
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await loginWithEmail(email, password);
      login(user);
      navigate(returnTo, { replace: true, state: { loginSuccess: true } });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate, returnTo]);

  if (tv) {
    return (
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="flex min-h-screen items-center justify-center bg-[#120818]">
          <TVQRLogin
            code={deviceCode}
            expired={codeExpired}
            error={error}
            onRefresh={requestCode}
            returnTo={returnTo}
          />
        </div>
      </FocusContext.Provider>
    );
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="flex min-h-screen items-center justify-center bg-[#120818]">
        <div className="w-full max-w-lg px-8">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-white">PlayVOD</h1>
            <p className="mt-3 text-lg text-white/50">Sign in to your account</p>
          </div>
          <div className="space-y-6">
            <NativeInput
              focusKey="login-email"
              label="Email"
              type="email"
              value={email}
              placeholder="your@email.com"
              nextFocus="login-password"
              onChange={setEmail}
            />
            <NativeInput
              focusKey="login-password"
              label="Password"
              type="password"
              value={password}
              placeholder="••••••••"
              prevFocus="login-email"
              nextFocus="login-submit"
              onChange={setPassword}
            />
            {error && <ErrorBanner message={error} />}
            <LoginButton loading={loading} onPress={handleLogin} />
            <SkipButton returnTo={returnTo} />
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

/* ---------- TV QR Login ---------- */

function TVQRLogin({
  code,
  expired,
  error,
  onRefresh,
  returnTo,
}: {
  code: string | null;
  expired: boolean;
  error: string;
  onRefresh: () => void;
  returnTo: string;
}) {
  const pairUrl = code ? `${PAIR_URL_BASE}?code=${code}` : '';

  return (
    <div className="flex max-w-[70vw] items-center gap-[4vw]">
      <div className="shrink-0">
        {code && !expired ? (
          <QRCode value={pairUrl} size={Math.round(window.innerWidth * 0.18)} />
        ) : (
          <div
            className="flex items-center justify-center rounded-xl bg-white/10"
            style={{ width: window.innerWidth * 0.18, height: window.innerWidth * 0.18 }}
          >
            <span className="text-[1.2vw] text-white/30">
              {expired ? 'Code expired' : 'Loading...'}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1">
        <h1 className="mb-[1vw] text-[2.5vw] font-bold text-white">Sign in to PlayVOD</h1>
        <ol className="mb-[1.5vw] space-y-[0.6vw] text-[1.2vw] text-white/70">
          <li>1. Scan the QR code with your phone</li>
          <li>2. Or visit <span className="font-medium text-white">tv-vod.blast.dvbuilder.com/#/pair</span></li>
          <li>3. Enter the code below and sign in</li>
        </ol>

        {code && !expired && (
          <div className="mb-[1.5vw] inline-block rounded-xl bg-white/10 px-[2vw] py-[0.8vw]">
            <span className="font-mono text-[3vw] font-bold tracking-[0.4em] text-white">
              {code}
            </span>
          </div>
        )}

        {error && <ErrorBanner message={error} />}

        <div className="mt-[1vw] flex gap-[1vw]">
          <FocusableActionButton
            focusKey="login-refresh"
            label={expired ? 'Get New Code' : 'Refresh Code'}
            onPress={onRefresh}
            nextFocus="login-skip"
          />
        </div>

        <div className="mt-[1vw]">
          <TVSkipButton returnTo={returnTo} prevFocus="login-refresh" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared Components ---------- */

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}

function FocusableActionButton({
  focusKey,
  label,
  onPress,
  secondary = false,
  prevFocus,
  nextFocus,
}: {
  focusKey: string;
  label: string;
  onPress: () => void;
  secondary?: boolean;
  prevFocus?: string;
  nextFocus?: string;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onPress,
    onArrowPress: (direction: string) => {
      if (direction === 'down' && nextFocus) { setFocus(nextFocus); return false; }
      if (direction === 'up' && prevFocus) { setFocus(prevFocus); return false; }
      if (direction === 'right' && nextFocus) { setFocus(nextFocus); return false; }
      if (direction === 'left' && prevFocus) { setFocus(prevFocus); return false; }
      return true;
    },
  });

  return (
    <button
      ref={ref}
      onClick={onPress}
      className={`rounded-xl px-6 py-3 text-[1vw] font-medium transition-all ${
        focused
          ? secondary
            ? 'bg-white/20 text-white scale-105'
            : 'bg-white text-black scale-105 shadow-lg'
          : secondary
            ? 'bg-white/5 text-white/50'
            : 'bg-white/20 text-white'
      }`}
    >
      {label}
    </button>
  );
}

function NativeInput({
  focusKey,
  label,
  type,
  value,
  placeholder,
  prevFocus,
  nextFocus,
  onChange,
}: {
  focusKey: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  prevFocus?: string;
  nextFocus?: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => inputRef.current?.focus(),
    onArrowPress: (direction: string) => {
      if (direction === 'down' && nextFocus) { setFocus(nextFocus); return false; }
      if (direction === 'up' && prevFocus) { setFocus(prevFocus); return false; }
      return true;
    },
  });

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white/70">{label}</label>
      <div
        ref={ref}
        className={`rounded-xl border-2 transition-all ${
          focused
            ? 'border-white/60 bg-white/10 shadow-lg shadow-white/5'
            : 'border-white/10 bg-white/5'
        }`}
      >
        <input
          ref={inputRef}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              inputRef.current?.blur();
              if (nextFocus) setFocus(nextFocus);
            }
          }}
          className="w-full bg-transparent px-5 py-4 text-lg text-white placeholder-white/30 outline-none"
        />
      </div>
    </div>
  );
}

function LoginButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  const { ref, focused } = useFocusable({
    focusKey: 'login-submit',
    onEnterPress: onPress,
    onArrowPress: (direction: string) => {
      if (direction === 'up') { setFocus('login-password'); return false; }
      if (direction === 'down') { setFocus('login-qr-switch'); return false; }
      return false;
    },
  });

  return (
    <button
      ref={ref}
      onClick={onPress}
      disabled={loading}
      className={`w-full rounded-xl py-4 text-lg font-semibold transition-all ${
        focused
          ? 'bg-white text-black shadow-lg shadow-white/20 scale-[1.02]'
          : 'bg-white/20 text-white hover:bg-white/30'
      } ${loading ? 'opacity-60' : ''}`}
    >
      {loading ? 'Signing in...' : 'Sign In'}
    </button>
  );
}

function TVSkipButton({ returnTo, prevFocus }: { returnTo: string; prevFocus?: string }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { ref, focused } = useFocusable({
    focusKey: 'login-skip',
    onEnterPress: () => {
      login({ id: 'guest', subscribed: false });
      navigate(returnTo, { replace: true });
    },
    onArrowPress: (direction: string) => {
      if (direction === 'up' && prevFocus) { setFocus(prevFocus); return false; }
      return false;
    },
  });

  return (
    <button
      ref={ref}
      className={`w-full rounded-xl py-3 text-sm transition-all ${
        focused ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
      }`}
    >
      Continue as Guest
    </button>
  );
}

function SkipButton({ returnTo }: { returnTo: string }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { ref, focused } = useFocusable({
    focusKey: 'login-skip',
    onEnterPress: () => {
      login({ id: 'guest', subscribed: false });
      navigate(returnTo, { replace: true });
    },
    onArrowPress: (direction: string) => {
      if (direction === 'up') { setFocus('login-submit'); return false; }
      return false;
    },
  });

  return (
    <button
      ref={ref}
      className={`w-full rounded-xl py-3 text-sm transition-all ${
        focused ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
      }`}
    >
      Continue as Guest
    </button>
  );
}
