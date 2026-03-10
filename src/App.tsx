import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ContentDetailsPage from './pages/ContentDetailsPage';
import SearchPage from './pages/SearchPage';

init({
  debug: false,
  visualDebug: false,
});

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/content/:contentId" element={<ContentDetailsPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
