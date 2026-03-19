import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useFocusable,
  FocusContext,
} from '@noriginmedia/norigin-spatial-navigation';
import { mapKeyEvent } from '../utils/keyMap';
import { searchContent } from '../services/api';
import type { ContentItem } from '../types/api';
import { getCoverImage, sizedUrl } from '../utils/assets';
import ContentCard from '../components/ContentCard';
import TVKeyboard from '../components/TVKeyboard';
import LoadingSpinner from '../components/LoadingSpinner';
import { isTV } from '../utils/platformInit';

export default function SearchPage() {
  if (isTV()) {
    return <TVSearchPage />;
  }
  return <WebSearchPage />;
}

function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        setLoading(true);
        searchContent(value.trim())
          .then((data) => {
            setResults(data);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        setResults([]);
      }
    }, 400);
  }, []);

  return { query, results, loading, handleQueryChange };
}

function WebSearchPage() {
  const navigate = useNavigate();
  const { query, results, loading, handleQueryChange } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#120818] px-[3vw] pt-24 pb-12">
      <div className="mx-auto max-w-4xl">
        <div className="relative mb-8">
          <svg
            viewBox="0 0 24 24"
            className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 fill-white/40"
          >
            <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search movies, shows..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-4 pl-12 text-lg text-white placeholder-white/30 outline-none transition-colors focus:border-[#e91e8c]/50 focus:bg-white/8"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <p className="py-16 text-center text-white/50">No results found.</p>
        )}

        {!loading && !query && (
          <p className="py-16 text-center text-white/30">Start typing to search</p>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="mb-4 text-sm text-white/50">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {results.map((item) => (
                <WebResultCard key={item.content_id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WebResultCard({ item }: { item: ContentItem }) {
  const navigate = useNavigate();
  const rawCover = getCoverImage(item.assets);
  const vw = window.innerWidth / 100;
  const cover = rawCover ? sizedUrl(rawCover, 9.375 * vw, 12.5 * vw) : null;

  return (
    <div
      className="group cursor-pointer"
      onClick={() => navigate(`/content/${item.content_id}`)}
    >
      <div className="overflow-hidden rounded-lg bg-white/5 transition-transform duration-200 group-hover:scale-105"
        style={{ aspectRatio: '3/4' }}
      >
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/10">
            <span className="text-xs text-white/50">{item.title}</span>
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm text-white/70 transition-colors group-hover:text-white">
        {item.title}
      </p>
    </div>
  );
}

function TVSearchPage() {
  const navigate = useNavigate();
  const { query, results, loading, handleQueryChange } = useSearch();
  const [browsingResults, setBrowsingResults] = useState(false);

  const handleKeyboardCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleKeyboardDone = useCallback(() => {
    if (results.length > 0) {
      setBrowsingResults(true);
    } else {
      navigate(-1);
    }
  }, [results.length, navigate]);

  if (browsingResults) {
    return (
      <ResultsBrowser
        query={query}
        results={results}
        onBack={() => setBrowsingResults(false)}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#120818]">
      <ResultsPreview query={query} results={results} loading={loading} />
      <div className="shrink-0 border-t border-white/5 bg-[#120818]/95">
        <TVKeyboard
          embedded
          value={query}
          label="Search"
          onChanged={handleQueryChange}
          onSubmit={handleKeyboardDone}
          onCancel={handleKeyboardCancel}
        />
      </div>
    </div>
  );
}

function ResultsPreview({
  query,
  results,
  loading,
}: {
  query: string;
  results: ContentItem[];
  loading: boolean;
}) {
  return (
    <div className="flex-1 overflow-hidden px-[3vw] pt-[5vw]">
      <h2 className="mb-[1vw] text-[1.3vw] font-semibold text-white">
        {query ? `Results for "${query}"` : 'Start typing to search'}
      </h2>

      {loading && (
        <div className="flex items-center justify-center py-[4vw]">
          <LoadingSpinner />
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <p className="text-[1vw] text-white/50">No results found.</p>
      )}

      {!loading && results.length > 0 && (
        <div className="flex gap-[1vw] overflow-x-hidden">
          {results.map((item) => (
            <div key={item.content_id} className="shrink-0">
              <ResultPreviewCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultPreviewCard({ item }: { item: ContentItem }) {
  const rawCover = getCoverImage(item.assets);
  const vw = window.innerWidth / 100;
  const cover = rawCover ? sizedUrl(rawCover, 7 * vw, 9.5 * vw) : null;

  return (
    <div style={{ width: '7vw' }}>
      <div
        className="overflow-hidden rounded-lg bg-white/5"
        style={{ width: '7vw', height: '9.5vw' }}
      >
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/10">
            <span className="text-[0.6vw] text-white/50">{item.title}</span>
          </div>
        )}
      </div>
      <p className="mt-[0.3vw] truncate text-[0.7vw] text-white/70">
        {item.title}
      </p>
    </div>
  );
}

function ResultsBrowser({
  query,
  results,
  onBack,
}: {
  query: string;
  results: ContentItem[];
  onBack: () => void;
}) {
  const { ref, focusKey, focusSelf } = useFocusable({});

  useEffect(() => {
    focusSelf();
  }, [focusSelf]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mapKeyEvent(e) === 'back') {
        e.preventDefault();
        e.stopPropagation();
        onBack();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onBack]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="min-h-screen bg-[#120818] px-[3vw] pt-[4vw] pb-[3vw]">
        <h2 className="mb-[1.5vw] text-[1.5vw] font-semibold text-white">
          Results for "{query}"
        </h2>
        <div className="grid grid-cols-2 gap-[1.2vw] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {results.map((item) => (
            <ContentCard key={item.content_id} item={item} showBadge />
          ))}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
