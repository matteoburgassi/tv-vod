import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { fetchContentsByCategory, fetchRubricList } from '../services/api';
import { HERO_RUBRIC_ID, CATEGORY_RUBRIC_IDS } from '../constants/api';
import { mapKeyEvent } from '../utils/keyMap';
import { getCoverImage } from '../utils/assets';
import { preloadImages } from '../utils/imageCache';
import type { ContentItem, RubricItem } from '../types/api';
import Hero from '../components/Hero';
import ContentRow, { getCardFocusKey } from '../components/ContentRow';
import LoadingSpinner from '../components/LoadingSpinner';
import ExitDialog from '../components/ExitDialog';

interface CategoryRow {
  rubric: RubricItem;
  items: ContentItem[];
}

const ROW_HEIGHT_VW = 18.75;
const ROW_GAP_VW = 0.833;
const ROW_VIRTUALIZE_BUFFER = 2;

export default function HomePage() {
  const [heroItems, setHeroItems] = useState<ContentItem[]>([]);
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expectedRowCount, setExpectedRowCount] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [, startTransition] = useTransition();
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
        setExpectedRowCount(rubrics.length);

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
          const validResults = results.filter((r) => r.items.length > 0);
          rowData.push(...validResults);

          const coverUrls: string[] = [];
          for (const r of validResults) {
            for (const item of r.items) {
              const url = getCoverImage(item.assets);
              if (url) coverUrls.push(url);
            }
          }
          preloadImages(coverUrls);

          const snapshot = [...rowData];
          startTransition(() => {
            setRows(snapshot);
          });
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
    (rowIndex: number) => (direction: string, cardIndex: number) => {
      if (direction === 'up') {
        if (rowIndex === 0) {
          setFocus('hero');
        } else {
          const targetRow = rowIndex - 1;
          setFocusedRowIndex(targetRow);
          const targetCount = rows[targetRow]?.items.length ?? 0;
          const clampedIndex = Math.min(cardIndex, targetCount - 1);
          setFocus(getCardFocusKey(targetRow, Math.max(0, clampedIndex)));
        }
        return false;
      }
      if (direction === 'down') {
        if (rowIndex < rows.length - 1) {
          const targetRow = rowIndex + 1;
          setFocusedRowIndex(targetRow);
          const targetCount = rows[targetRow]?.items.length ?? 0;
          const clampedIndex = Math.min(cardIndex, targetCount - 1);
          setFocus(getCardFocusKey(targetRow, Math.max(0, clampedIndex)));
        }
        return false;
      }
      return true;
    },
    [rows],
  );

  if (loading && !heroItems.length) return <LoadingSpinner />;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>
        {heroItems.length > 0 && (
          <Hero items={heroItems.slice(0, 5)} firstRowFocusKey={rows.length > 0 ? getCardFocusKey(0, 0) : rowFocusKeys[0]} />
        )}
        <div className="relative z-10 -mt-6 pb-20">
          {rows.map((row, i) => {
            const inRange = i >= Math.max(0, focusedRowIndex - ROW_VIRTUALIZE_BUFFER)
              && i <= Math.min(rows.length - 1, focusedRowIndex + ROW_VIRTUALIZE_BUFFER);
            if (!inRange) {
              return (
                <div
                  key={row.rubric.rubric_id}
                  style={{ height: `${ROW_HEIGHT_VW}vw`, marginBottom: `${ROW_GAP_VW}vw`, contain: 'strict' }}
                />
              );
            }
            return (
              <ContentRow
                key={row.rubric.rubric_id}
                title={row.rubric.rubric_title}
                items={row.items}
                rowIndex={i}
                focusKeyOverride={rowFocusKeys[i]}
                onArrowPress={makeRowArrowPress(i)}
              />
            );
          })}
          {loading && expectedRowCount > rows.length && (
            <div
              style={{
                height: `${(expectedRowCount - rows.length) * (ROW_HEIGHT_VW + ROW_GAP_VW)}vw`,
                contain: 'strict',
              }}
            />
          )}
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
