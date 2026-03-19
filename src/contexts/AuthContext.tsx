import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from 'tv-vod-auth';

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const STORAGE_KEY = 'tv_vod_user';

const AuthContext = createContext<AuthContextValue | null>(null);

function loadPersistedUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: loadPersistedUser(),
    loading: false,
  });

  useEffect(() => {
    if (state.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state.user]);

  const login = useCallback((user: User) => {
    setState({ user, loading: false });
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      isAuthenticated: state.user !== null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
