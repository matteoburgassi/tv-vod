import { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  useFocusable,
  FocusContext,
} from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import ContentCard from './ContentCard';
import { smoothScrollTo } from '../utils/smoothScroll';

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
const SCROLL_PADDING = 48;

export default memo(function ContentRow({ title, items, showBadge = false, focusKeyOverride, onArrowPress }: ContentRowProps) {
  const { ref, focusKey, focusSelf, hasFocusedChild } = useFocusable({
    focusKey: focusKeyOverride,
    trackChildren: true,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 14]);

  const computeRange = useCallback(() => {
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

  const scheduleRangeUpdate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(computeRange);
  }, [computeRange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    computeRange();
    el.addEventListener('scroll', scheduleRangeUpdate, { passive: true });
    return () => {
      el.removeEventListener('scroll', scheduleRangeUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [computeRange, scheduleRangeUpdate]);

  const handleCardFocused = useCallback((el: HTMLDivElement) => {
    const container = scrollRef.current;
    if (!container) return;

    const cardLeft = el.offsetLeft - SCROLL_PADDING;
    const cardRight = el.offsetLeft + el.offsetWidth + SCROLL_PADDING;
    const viewLeft = container.scrollLeft;
    const viewRight = container.scrollLeft + container.clientWidth;

    if (cardLeft < viewLeft) {
      smoothScrollTo(container, cardLeft, 'x', 150);
    } else if (cardRight > viewRight) {
      smoothScrollTo(container, cardRight - container.clientWidth, 'x', 150);
    }

    const rowEl = container.parentElement;
    if (rowEl) {
      const rect = rowEl.getBoundingClientRect();
      const viewportH = window.innerHeight;
      if (rect.top < 80) {
        smoothScrollTo(window, window.scrollY + rect.top - 80, 'y', 150);
      } else if (rect.bottom > viewportH - 40) {
        smoothScrollTo(window, window.scrollY + rect.bottom - viewportH + 40, 'y', 150);
      }
    }
  }, []);

  if (!items.length) return null;

  const totalWidth = items.length * CARD_WIDTH + (items.length - 1) * CARD_GAP;
  const [startIdx, endIdx] = visibleRange;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="mb-4"
        style={{ contain: 'layout style' }}
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
          style={{
            scrollPaddingInline: '3rem',
            scrollbarWidth: 'none',
          }}
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
                  <ContentCard
                    item={item}
                    showBadge={showBadge}
                    onArrowPress={onArrowPress}
                    onFocused={handleCardFocused}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
});
