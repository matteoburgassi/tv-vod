import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useAuth } from '../contexts/AuthContext';
import { requestDeviceCode, pollDeviceCode, PAIR_URL_BASE, POLL_INTERVAL } from 'tv-vod-auth';
import QRCode from '../components/QRCode';
import { isTV } from '../utils/platformInit';

const tv = isTV();

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string })?.returnTo ?? '/';

  const [error, setError] = useState('');
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
    requestCode();
    return stopPolling;
  }, []);

  useEffect(() => {
    if (tv) {
      setFocus('login-refresh');
    }
  }, []);

  const handleSkip = useCallback(() => {
    login({ id: 'guest', subscribed: false });
    navigate(returnTo, { replace: true });
  }, [login, navigate, returnTo]);

  if (tv) {
    return (
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="flex min-h-screen items-center justify-center bg-[#120818]">
          <TVQRLogin
            code={deviceCode}
            expired={codeExpired}
            error={error}
            onRefresh={requestCode}
            onSkip={handleSkip}
          />
        </div>
      </FocusContext.Provider>
    );
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="flex min-h-screen items-center justify-center bg-[#120818]">
        <BrowserQRLogin
          code={deviceCode}
          expired={codeExpired}
          error={error}
          onRefresh={requestCode}
          onSkip={handleSkip}
        />
      </div>
    </FocusContext.Provider>
  );
}

/* ---------- Browser QR Login ---------- */

function BrowserQRLogin({
  code,
  expired,
  error,
  onRefresh,
  onSkip,
}: {
  code: string | null;
  expired: boolean;
  error: string;
  onRefresh: () => void;
  onSkip: () => void;
}) {
  const pairUrl = code ? `${PAIR_URL_BASE}?code=${code}` : '';

  return (
    <div className="w-full max-w-md px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white">PlayVOD</h1>
        <p className="mt-3 text-lg text-white/50">Sign in to your account</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="flex justify-center">
          {code && !expired ? (
            <div className="rounded-xl bg-white p-3">
              <QRCode value={pairUrl} size={200} />
            </div>
          ) : (
            <div className="flex h-[224px] w-[224px] items-center justify-center rounded-xl bg-white/10">
              <span className="text-sm text-white/30">
                {expired ? 'Code expired' : 'Loading...'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            Scan the QR code with your phone to sign in
          </p>

          {code && !expired && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-white/40">Or enter this code manually</p>
              <div className="inline-block rounded-lg bg-white/10 px-6 py-3">
                <span className="font-mono text-2xl font-bold tracking-[0.3em] text-white">
                  {code}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/40">
                at <span className="font-medium text-white/60">tv-vod.blast.dvbuilder.com/#/pair</span>
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onRefresh}
            className="w-full rounded-xl bg-white/10 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            {expired ? 'Get New Code' : 'Refresh Code'}
          </button>
          <button
            onClick={onSkip}
            className="w-full rounded-xl py-3 text-sm text-white/40 transition-colors hover:text-white/60"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- TV QR Login ---------- */

function TVQRLogin({
  code,
  expired,
  error,
  onRefresh,
  onSkip,
}: {
  code: string | null;
  expired: boolean;
  error: string;
  onRefresh: () => void;
  onSkip: () => void;
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

        {error && (
          <div className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-[1vw] flex gap-[1vw]">
          <FocusableActionButton
            focusKey="login-refresh"
            label={expired ? 'Get New Code' : 'Refresh Code'}
            onPress={onRefresh}
            nextFocus="login-skip"
          />
        </div>

        <div className="mt-[1vw]">
          <TVSkipButton onSkip={onSkip} prevFocus="login-refresh" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared Components ---------- */

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

function TVSkipButton({ onSkip, prevFocus }: { onSkip: () => void; prevFocus?: string }) {
  const { ref, focused } = useFocusable({
    focusKey: 'login-skip',
    onEnterPress: onSkip,
    onArrowPress: (direction: string) => {
      if (direction === 'up' && prevFocus) { setFocus(prevFocus); return false; }
      return false;
    },
  });

  return (
    <button
      ref={ref}
      onClick={onSkip}
      className={`w-full rounded-xl py-3 text-sm transition-all ${
        focused ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
      }`}
    >
      Continue as Guest
    </button>
  );
}
