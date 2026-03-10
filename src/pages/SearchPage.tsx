import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { searchContent } from '../services/api';
import type { ContentItem } from '../types/api';
import ContentCard from '../components/ContentCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { ref, focusKey, focusSelf } = useFocusable({});

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    searchContent(query).then((data) => {
      if (!cancelled) {
        setResults(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [query]);

  useEffect(() => {
    if (!loading && results.length > 0) focusSelf();
  }, [loading, results.length, focusSelf]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="min-h-screen px-12 pt-24 pb-20">
        <h2 className="mb-6 text-2xl font-semibold text-white">
          {query ? `Results for "${query}"` : 'Search'}
        </h2>

        {loading && <LoadingSpinner />}

        {!loading && query && results.length === 0 && (
          <p className="text-lg text-white/50">No results found.</p>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((item) => (
              <ContentCard key={item.content_id} item={item} showBadge />
            ))}
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}
