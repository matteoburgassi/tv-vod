import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useAuth } from '../contexts/AuthContext';
import { loginWithEmail } from '@digitalvirgo/drm-player';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string })?.returnTo ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { ref, focusKey } = useFocusable({
    focusKey: 'login-page',
    isFocusBoundary: true,
    trackChildren: true,
  });

  useEffect(() => {
    setFocus('login-email');
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
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="flex min-h-screen items-center justify-center bg-[#120818]">
        <div className="w-full max-w-lg px-8">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-white">PlayVOD</h1>
            <p className="mt-3 text-lg text-white/50">Sign in to your account</p>
          </div>

          <div className="space-y-6">
            <FocusableInput
              focusKey="login-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
              nextFocus="login-password"
            />

            <FocusableInput
              focusKey="login-password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              prevFocus="login-email"
              nextFocus="login-submit"
              onSubmit={handleLogin}
            />

            {error && (
              <div className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <LoginButton
              loading={loading}
              onPress={handleLogin}
            />

            <SkipButton returnTo={returnTo} />
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

const hasNativeBridge = typeof (window as any).AndroidBridge?.showInputDialog === 'function';

function FocusableInput({
  focusKey,
  label,
  type,
  value,
  onChange,
  placeholder,
  prevFocus,
  nextFocus,
  onSubmit,
}: {
  focusKey: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  prevFocus?: string;
  nextFocus?: string;
  onSubmit?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === focusKey) {
        onChange(detail.value);
        if (detail.next && hasNativeBridge) {
          setTimeout(() => setFocus(detail.next), 100);
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('native-open-field', { detail: { id: detail.next } }));
          }, 200);
        }
      }
    };
    document.addEventListener('native-input', handler);
    return () => document.removeEventListener('native-input', handler);
  }, [focusKey, onChange]);

  useEffect(() => {
    if (!hasNativeBridge) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === focusKey) {
        (window as any).AndroidBridge.showInputDialog(
          focusKey,
          label,
          value,
          type === 'password',
          nextFocus ?? '',
        );
      }
    };
    document.addEventListener('native-open-field', handler);
    return () => document.removeEventListener('native-open-field', handler);
  }, [focusKey, label, value, type, nextFocus]);

  const handleEnter = useCallback(() => {
    if (hasNativeBridge) {
      (window as any).AndroidBridge.showInputDialog(
        focusKey,
        label,
        value,
        type === 'password',
        nextFocus ?? '',
      );
    } else {
      inputRef.current?.focus();
    }
  }, [focusKey, label, value, type, nextFocus]);

  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: handleEnter,
    onArrowPress: (direction: string) => {
      if (direction === 'down' && nextFocus) {
        setFocus(nextFocus);
        return false;
      }
      if (direction === 'up' && prevFocus) {
        setFocus(prevFocus);
        return false;
      }
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
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent px-5 py-4 text-lg text-white placeholder-white/30 outline-none"
          readOnly={hasNativeBridge}
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
      if (direction === 'up') {
        setFocus('login-password');
        return false;
      }
      if (direction === 'down') {
        setFocus('login-skip');
        return false;
      }
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

function SkipButton({ returnTo }: { returnTo: string }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { ref, focused } = useFocusable({
    focusKey: 'login-skip',
    onEnterPress: () => {
      login({
        id: 'guest',
        subscribed: false,
      });
      navigate(returnTo, { replace: true });
    },
    onArrowPress: (direction: string) => {
      if (direction === 'up') {
        setFocus('login-submit');
        return false;
      }
      return false;
    },
  });

  return (
    <button
      ref={ref}
      className={`w-full rounded-xl py-3 text-sm transition-all ${
        focused
          ? 'bg-white/10 text-white'
          : 'text-white/40 hover:text-white/60'
      }`}
    >
      Continue as Guest
    </button>
  );
}
