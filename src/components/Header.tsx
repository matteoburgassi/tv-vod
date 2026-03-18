import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { ref, focusKey } = useFocusable({
    focusKey: 'header',
    isFocusBoundary: false,
    trackChildren: true,
  });

  const handleArrowPress = useCallback((direction: string) => {
    if (direction === 'down') {
      setFocus('hero');
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    let ticking = false;
    const handler = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > window.innerWidth * 0.02);
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith('/search')) {
      setQuery('');
    }
  }, [location.pathname]);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim()) {
          navigate(`/search?q=${encodeURIComponent(value.trim())}`);
        }
      }, 400);
    },
    [navigate],
  );

  return (
    <FocusContext.Provider value={focusKey}>
      <header
        ref={ref}
        className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between px-12 py-4"
        style={{
          backgroundColor: scrolled ? 'rgba(18,8,24,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          transition: 'background-color 300ms ease-out, backdrop-filter 300ms ease-out',
          transform: 'translate3d(0,0,0)',
        }}
      >
        <LogoButton onPress={() => navigate('/')} onArrowPress={handleArrowPress} />
        <div className="flex items-center gap-4">
          <SearchInput value={query} onChange={handleChange} onArrowPress={handleArrowPress} />
          <UserButton onArrowPress={handleArrowPress} />
        </div>
      </header>
    </FocusContext.Provider>
  );
}

function LogoButton({ onPress, onArrowPress }: { onPress: () => void; onArrowPress: (direction: string) => boolean }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress, onArrowPress });

  return (
    <button
      ref={ref}
      onClick={onPress}
      style={{
        transform: focused ? 'translate3d(0,0,0) scale(1.05)' : 'translate3d(0,0,0) scale(1)',
        transition: 'transform 200ms ease-out, filter 200ms ease-out',
        filter: focused ? 'drop-shadow(0 0 8px rgba(233,30,140,0.5))' : 'none',
      }}
    >
      <img
        src="/playvod-logo-landscape-light.1920-10.svg"
        alt="PlayVOD"
        className="h-8"
      />
    </button>
  );
}

function SearchInput({
  value,
  onChange,
  onArrowPress,
}: {
  value: string;
  onChange: (v: string) => void;
  onArrowPress: (direction: string) => boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, focused } = useFocusable({
    onEnterPress: () => inputRef.current?.focus(),
    onArrowPress,
  });

  return (
    <div
      ref={ref}
      className="flex items-center gap-2 rounded-lg border px-3 py-2"
      style={{
        borderColor: focused ? '#e91e8c' : 'rgba(255,255,255,0.15)',
        backgroundColor: focused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
        boxShadow: focused ? '0 0 0 2px rgba(233,30,140,0.5)' : 'none',
        transition: 'border-color 200ms ease-out, background-color 200ms ease-out, box-shadow 200ms ease-out',
      }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-white/50">
        <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        className="w-40 bg-transparent text-sm text-white outline-none placeholder:text-white/30 sm:w-56"
      />
    </div>
  );
}

function UserButton({ onArrowPress }: { onArrowPress: (direction: string) => boolean }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handlePress = useCallback(() => {
    if (isAuthenticated) {
      logout();
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, logout, navigate]);

  const { ref, focused } = useFocusable({
    onEnterPress: handlePress,
    onArrowPress,
  });

  if (!isAuthenticated) {
    return (
      <button
        ref={ref}
        onClick={handlePress}
        className="flex items-center gap-2 rounded-lg border px-3 py-2"
        style={{
          borderColor: focused ? '#e91e8c' : 'rgba(255,255,255,0.15)',
          backgroundColor: focused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          boxShadow: focused ? '0 0 0 2px rgba(233,30,140,0.5)' : 'none',
          transition: 'border-color 200ms ease-out, background-color 200ms ease-out, box-shadow 200ms ease-out',
        }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white/70">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        <span className="text-sm text-white/80">Sign In</span>
      </button>
    );
  }

  const displayName = user?.firstname || user?.email?.split('@')[0] || 'Guest';

  return (
    <button
      ref={ref}
      onClick={handlePress}
      className="flex items-center gap-2 rounded-lg border px-3 py-2"
      style={{
        borderColor: focused ? '#e91e8c' : 'rgba(255,255,255,0.15)',
        backgroundColor: focused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
        boxShadow: focused ? '0 0 0 2px rgba(233,30,140,0.5)' : 'none',
        transition: 'border-color 200ms ease-out, background-color 200ms ease-out, box-shadow 200ms ease-out',
      }}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-bold text-fuchsia-500">
        {displayName.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm text-white/80">{displayName}</span>
    </button>
  );
}
