import { useState, useCallback, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { init, useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Toast from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';
import HomePage from './pages/HomePage';

const ContentDetailsPage = lazy(() => import('./pages/ContentDetailsPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const PairPage = lazy(() => import('./pages/PairPage'));

init({
  debug: false,
  visualDebug: false,
  useGetBoundingClientRect: true,
});

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
document.addEventListener('keydown', (e) => {
  const el = document.activeElement;
  if (el && INPUT_TAGS.has(el.tagName) && NAV_KEYS.has(e.key)) {
    e.stopImmediatePropagation();
  }
}, true);

const HEADER_SAFE_EXTRA_PX = 28;

function AppLayout() {
  const location = useLocation();
  const [showLoginToast, setShowLoginToast] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const scrollEl = document.getElementById('page-scroll-container');

    const syncHeaderSafe = () => {
      const header = document.querySelector('header');
      const h = header
        ? Math.ceil(header.getBoundingClientRect().height) + HEADER_SAFE_EXTRA_PX
        : 160;
      root.style.setProperty('--header-safe', `${h}px`);
      if (scrollEl) {
        scrollEl.style.scrollPaddingTop = `${h}px`;
      }
    };

    syncHeaderSafe();
    window.addEventListener('resize', syncHeaderSafe);
    const t = window.setTimeout(syncHeaderSafe, 0);
    const t2 = window.setTimeout(syncHeaderSafe, 400);

    return () => {
      window.removeEventListener('resize', syncHeaderSafe);
      window.clearTimeout(t);
      window.clearTimeout(t2);
      root.style.removeProperty('--header-safe');
      if (scrollEl) scrollEl.style.removeProperty('scroll-padding-top');
    };
  }, [location.pathname]);

  useEffect(() => {
    if ((location.state as { loginSuccess?: boolean })?.loginSuccess) {
      setShowLoginToast(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const dismissToast = useCallback(() => setShowLoginToast(false), []);

  const { ref, focusKey } = useFocusable({
    isFocusBoundary: false,
    trackChildren: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        id="page-scroll-container"
        className="bg-[#120818]"
        style={{
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pair" element={<PairPage />} />
            <Route
              path="*"
              element={
                <>
                  <Header />
                  <main>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/content/:contentId" element={<ContentDetailsPage />} />
                      <Route path="/search" element={<SearchPage />} />
                    </Routes>
                  </main>
                </>
              }
            />
          </Routes>
        </Suspense>
        {showLoginToast && <Toast message="Signed in successfully" onDone={dismissToast} />}
      </div>
    </FocusContext.Provider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </HashRouter>
  );
}
