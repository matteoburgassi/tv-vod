import { useState, useCallback, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { init, useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Toast from './components/Toast';
import HomePage from './pages/HomePage';
import ContentDetailsPage from './pages/ContentDetailsPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';

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

function AppLayout() {
  const location = useLocation();
  const [showLoginToast, setShowLoginToast] = useState(false);

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
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
