import { useState, useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { fetchContentsByCategory, fetchRubricList } from '../services/api';
import { HERO_RUBRIC_ID, CATEGORY_RUBRIC_IDS } from '../constants/api';
import type { ContentItem, RubricItem } from '../types/api';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import LoadingSpinner from '../components/LoadingSpinner';

interface CategoryRow {
  rubric: RubricItem;
  items: ContentItem[];
}

export default function HomePage() {
  const [heroItems, setHeroItems] = useState<ContentItem[]>([]);
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, focusKey, focusSelf } = useFocusable({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [hero, rubrics] = await Promise.all([
          fetchContentsByCategory(HERO_RUBRIC_ID),
          fetchRubricList(CATEGORY_RUBRIC_IDS.join(',')),
        ]);

        if (cancelled) return;
        setHeroItems(hero);

        const rowData: CategoryRow[] = [];
        const batches = [];
        for (let i = 0; i < rubrics.length; i += 5) {
          batches.push(rubrics.slice(i, i + 5));
        }

        for (const batch of batches) {
          if (cancelled) return;
          const results = await Promise.all(
            batch.map(async (rubric) => {
              const items = await fetchContentsByCategory(String(rubric.rubric_id));
              return { rubric, items };
            }),
          );
          rowData.push(...results.filter((r) => r.items.length > 0));
          setRows([...rowData]);
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loading) focusSelf();
  }, [loading, focusSelf]);

  if (loading && !heroItems.length) return <LoadingSpinner />;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>
        {heroItems.length > 0 && <Hero items={heroItems.slice(0, 5)} />}
        <div className="relative z-10 -mt-20 pb-20">
          {rows.map((row) => (
            <ContentRow
              key={row.rubric.rubric_id}
              title={row.rubric.rubric_title}
              items={row.items}
            />
          ))}
          {loading && <LoadingSpinner />}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
