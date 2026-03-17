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
    const handler = () => setScrolled(window.scrollY > 40);
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
        className={`fixed top-0 right-0 left-0 z-40 flex items-center justify-between px-12 py-4 transition-all duration-300 ${
          scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md' : 'bg-transparent'
        }`}
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
      className={`text-2xl font-semibold tracking-tight text-white transition-all duration-200 ${
        focused ? 'scale-105 drop-shadow-[0_0_8px_rgba(233,30,140,0.5)]' : ''
      }`}
    >
      Play<span className="text-fuchsia-500">VOD</span>
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
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 ${
        focused
          ? 'border-fuchsia-500 bg-white/10 ring-2 ring-fuchsia-500/50'
          : 'border-white/15 bg-white/5'
      }`}
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
  const { user, logout } = useAuth();
  const { ref, focused } = useFocusable({
    onEnterPress: logout,
    onArrowPress,
  });

  const displayName = user?.firstname || user?.email?.split('@')[0] || 'Guest';

  return (
    <button
      ref={ref}
      onClick={logout}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 ${
        focused
          ? 'border-fuchsia-500 bg-white/10 ring-2 ring-fuchsia-500/50'
          : 'border-white/15 bg-white/5'
      }`}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-bold text-fuchsia-500">
        {displayName.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm text-white/80">{displayName}</span>
    </button>
  );
}
