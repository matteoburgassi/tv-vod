import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useAuth } from '../contexts/AuthContext';
import { loginWithEmail } from '@digitalvirgo/drm-player';
import TVKeyboard from '../components/TVKeyboard';

type ActiveField = 'email' | 'password' | null;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string })?.returnTo ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>(null);

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

  const openKeyboard = useCallback((field: ActiveField) => {
    setActiveField(field);
  }, []);

  const closeKeyboard = useCallback(() => {
    const field = activeField;
    setActiveField(null);
    setTimeout(() => {
      if (field === 'email') setFocus('login-email');
      else if (field === 'password') setFocus('login-password');
    }, 100);
  }, [activeField]);

  const handleKeyboardSubmit = useCallback(
    (value: string) => {
      if (activeField === 'email') {
        setEmail(value);
        setActiveField(null);
        setTimeout(() => setActiveField('password'), 150);
      } else if (activeField === 'password') {
        setPassword(value);
        setActiveField(null);
        setTimeout(() => setFocus('login-submit'), 100);
      }
    },
    [activeField],
  );

  return (
    <>
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
                placeholder="your@email.com"
                prevFocus={undefined}
                nextFocus="login-password"
                onRequestKeyboard={() => openKeyboard('email')}
              />

              <FocusableInput
                focusKey="login-password"
                label="Password"
                type="password"
                value={password}
                placeholder="••••••••"
                prevFocus="login-email"
                nextFocus="login-submit"
                onRequestKeyboard={() => openKeyboard('password')}
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

      {activeField && (
        <TVKeyboard
          value={activeField === 'email' ? email : password}
          label={activeField === 'email' ? 'Email' : 'Password'}
          masked={activeField === 'password'}
          onChanged={activeField === 'email' ? setEmail : setPassword}
          onSubmit={handleKeyboardSubmit}
          onCancel={closeKeyboard}
        />
      )}
    </>
  );
}

function FocusableInput({
  focusKey,
  label,
  type,
  value,
  placeholder,
  prevFocus,
  nextFocus,
  onRequestKeyboard,
}: {
  focusKey: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  prevFocus?: string;
  nextFocus?: string;
  onRequestKeyboard?: () => void;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => onRequestKeyboard?.(),
    onArrowPress: (direction: string) => {
      console.log("onArrowPress")
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
        <div className="flex items-center px-5 py-4">
          <span className={`text-lg ${value ? 'text-white' : 'text-white/30'}`}>
            {value ? (type === 'password' ? '•'.repeat(value.length) : value) : placeholder}
          </span>
          {focused && (
            <span className="ml-0.5 inline-block h-6 w-0.5 animate-pulse bg-white" />
          )}
        </div>
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
