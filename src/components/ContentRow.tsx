import { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  useFocusable,
  FocusContext,
} from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import ContentCard from './ContentCard';

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  showBadge?: boolean;
  focusKeyOverride?: string;
  onArrowPress?: (direction: string) => boolean;
}

const CARD_WIDTH = 180;
const CARD_GAP = 16;
const BUFFER = 4;

export default memo(function ContentRow({ title, items, showBadge = false, focusKeyOverride, onArrowPress }: ContentRowProps) {
  const { ref, focusKey, focusSelf, hasFocusedChild } = useFocusable({
    focusKey: focusKeyOverride,
    trackChildren: true,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 12]);

  const updateVisibleRange = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const viewportWidth = el.clientWidth;
    const stride = CARD_WIDTH + CARD_GAP;

    const firstVisible = Math.floor(scrollLeft / stride);
    const lastVisible = Math.ceil((scrollLeft + viewportWidth) / stride);

    const start = Math.max(0, firstVisible - BUFFER);
    const end = Math.min(items.length - 1, lastVisible + BUFFER);

    setVisibleRange((prev) => {
      if (prev[0] === start && prev[1] === end) return prev;
      return [start, end];
    });
  }, [items.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateVisibleRange();
    el.addEventListener('scroll', updateVisibleRange, { passive: true });
    return () => el.removeEventListener('scroll', updateVisibleRange);
  }, [updateVisibleRange]);

  if (!items.length) return null;

  const totalWidth = items.length * CARD_WIDTH + (items.length - 1) * CARD_GAP;
  const [startIdx, endIdx] = visibleRange;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="mb-4"
        style={{ contain: 'layout style', contentVisibility: 'auto', containIntrinsicSize: 'auto none auto 360px' }}
        onClick={() => focusSelf()}
      >
        <h2
          className="mb-3 px-12 text-xl font-semibold"
          style={{
            color: hasFocusedChild ? 'white' : 'rgba(255,255,255,0.6)',
            transition: 'color 200ms ease-out',
          }}
        >
          {title}
        </h2>
        <div
          ref={scrollRef}
          className="overflow-x-auto px-12 py-4"
          style={{ scrollPaddingInline: '3rem' }}
        >
          <div
            style={{
              width: totalWidth,
              height: 280,
              position: 'relative',
            }}
          >
            {items.map((item, i) => {
              if (i < startIdx || i > endIdx) return null;
              return (
                <div
                  key={item.content_id}
                  style={{
                    position: 'absolute',
                    left: i * (CARD_WIDTH + CARD_GAP),
                    top: 0,
                    width: CARD_WIDTH,
                  }}
                >
                  <ContentCard item={item} showBadge={showBadge} onArrowPress={onArrowPress} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
});
