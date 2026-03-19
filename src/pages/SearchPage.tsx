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

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [browsingResults, setBrowsingResults] = useState(false);
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
