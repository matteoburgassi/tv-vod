import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { init, useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ContentDetailsPage from './pages/ContentDetailsPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';

init({
  debug: false,
  visualDebug: false,
  useGetBoundingClientRect: true,
});

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const { ref, focusKey } = useFocusable({
    isFocusBoundary: false,
    trackChildren: true,
  });

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/content/:contentId" element={<ContentDetailsPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </main>
      </div>
    </FocusContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
