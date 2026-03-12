import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { fetchContentsByCategory, fetchRubricList } from '../services/api';
import { HERO_RUBRIC_ID, CATEGORY_RUBRIC_IDS } from '../constants/api';
import { mapKeyEvent } from '../utils/keyMap';
import type { ContentItem, RubricItem } from '../types/api';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import LoadingSpinner from '../components/LoadingSpinner';
import ExitDialog from '../components/ExitDialog';

interface CategoryRow {
  rubric: RubricItem;
  items: ContentItem[];
}

export default function HomePage() {
  const [heroItems, setHeroItems] = useState<ContentItem[]>([]);
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const { ref, focusKey, focusSelf } = useFocusable({});

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showExitDialog) return;
      if (mapKeyEvent(e) === 'back') {
        e.preventDefault();
        setShowExitDialog(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showExitDialog]);

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

  const rowFocusKeys = useMemo(
    () => rows.map((_, i) => `content-row-${i}`),
    [rows.length],
  );

  const makeRowArrowPress = useCallback(
    (rowIndex: number) => (direction: string) => {
      if (direction === 'up') {
        if (rowIndex === 0) {
          setFocus('hero');
        } else {
          setFocus(rowFocusKeys[rowIndex - 1]);
        }
        return false;
      }
      if (direction === 'down') {
        if (rowIndex < rowFocusKeys.length - 1) {
          setFocus(rowFocusKeys[rowIndex + 1]);
        }
        return false;
      }
      return true;
    },
    [rowFocusKeys],
  );

  if (loading && !heroItems.length) return <LoadingSpinner />;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>
        {heroItems.length > 0 && (
          <Hero items={heroItems.slice(0, 5)} firstRowFocusKey={rowFocusKeys[0]} />
        )}
        <div className="relative z-10 -mt-6 pb-20">
          {rows.map((row, i) => (
            <ContentRow
              key={row.rubric.rubric_id}
              title={row.rubric.rubric_title}
              items={row.items}
              focusKeyOverride={rowFocusKeys[i]}
              onArrowPress={makeRowArrowPress(i)}
            />
          ))}
          {loading && <LoadingSpinner />}
        </div>
      </div>
      {showExitDialog && (
        <ExitDialog
          onConfirm={() => window.close()}
          onCancel={() => setShowExitDialog(false)}
        />
      )}
    </FocusContext.Provider>
  );
}
