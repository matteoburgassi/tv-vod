import { memo, useCallback, useRef } from 'react';
import {
  useFocusable,
  FocusContext,
} from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import ContentCard from './ContentCard';
import { animateValue } from '../utils/smoothScroll';

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  showBadge?: boolean;
  focusKeyOverride?: string;
  rowIndex?: number;
  onArrowPress?: (direction: string, cardIndex: number) => boolean;
}

const CARD_WIDTH = 180;
const CARD_GAP = 16;
const SCROLL_PADDING = 48;
const ANIM_DURATION = 120;

export function getCardFocusKey(rowIndex: number, cardIndex: number) {
  return `row-${rowIndex}-card-${cardIndex}`;
}

export default memo(function ContentRow({ title, items, showBadge = false, focusKeyOverride, rowIndex = 0, onArrowPress }: ContentRowProps) {
  const { ref, focusKey, focusSelf, hasFocusedChild } = useFocusable({
    focusKey: focusKeyOverride,
    trackChildren: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const animKeyRef = useRef({});
  const vertAnimKeyRef = useRef({});
  const focusedCardIndexRef = useRef(0);

  const pendingFocusRef = useRef(0);

  const handleCardFocused = useCallback((el: HTMLDivElement, cardIndex: number) => {
    focusedCardIndexRef.current = cardIndex;
    cancelAnimationFrame(pendingFocusRef.current);

    pendingFocusRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      const strip = stripRef.current;
      if (!container || !strip) return;

      const viewportWidth = container.clientWidth;
      const currentOffset = offsetRef.current;

      const wrapper = el.parentElement as HTMLElement | null;
      const cardLeft = wrapper ? wrapper.offsetLeft : el.offsetLeft;
      const cardRight = cardLeft + (wrapper ? wrapper.offsetWidth : el.offsetWidth);

      const visibleLeft = -currentOffset + SCROLL_PADDING;
      const visibleRight = -currentOffset + viewportWidth - SCROLL_PADDING;

      let newOffset = currentOffset;

      if (cardLeft < visibleLeft) {
        newOffset = -(cardLeft - SCROLL_PADDING);
      } else if (cardRight > visibleRight) {
        newOffset = -(cardRight - viewportWidth + SCROLL_PADDING);
      }

      const totalWidth = items.length * CARD_WIDTH + (items.length - 1) * CARD_GAP;
      const maxOffset = 0;
      const scrollableWidth = totalWidth + SCROLL_PADDING * 2;
      const minOffset = scrollableWidth > viewportWidth
        ? -(scrollableWidth - viewportWidth)
        : 0;
      newOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

      if (newOffset !== currentOffset) {
        animateValue(
          animKeyRef.current,
          currentOffset,
          newOffset,
          ANIM_DURATION,
          (v) => {
            offsetRef.current = v;
            if (strip) {
              strip.style.transform = `translate3d(${v}px, 0, 0)`;
            }
          },
        );
      }

      const rowEl = container.closest('[data-content-row]');
      if (rowEl) {
        const rect = rowEl.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const scrollEl = document.getElementById('page-scroll-container');
        if (scrollEl) {
          let delta = 0;
          if (rect.top < 80) {
            delta = rect.top - 80;
          } else if (rect.bottom > viewportH) {
            delta = rect.bottom - viewportH + 20;
          }
          if (delta !== 0) {
            const targetTop = scrollEl.scrollTop + delta;
            animateValue(
              vertAnimKeyRef.current,
              scrollEl.scrollTop,
              targetTop,
              ANIM_DURATION,
              (v) => { scrollEl.scrollTop = v; },
            );
          }
        }
      }
    });
  }, [items.length]);

  const makeCardArrowPress = useCallback(
    (cardIndex: number) => (direction: string) => {
      if (onArrowPress && (direction === 'up' || direction === 'down')) {
        return onArrowPress(direction, cardIndex);
      }
      return true;
    },
    [onArrowPress],
  );

  const makeCardFocused = useCallback(
    (cardIndex: number) => (el: HTMLDivElement) => {
      handleCardFocused(el, cardIndex);
    },
    [handleCardFocused],
  );

  if (!items.length) return null;

  const totalWidth = items.length * CARD_WIDTH + (items.length - 1) * CARD_GAP;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        data-content-row
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
          ref={containerRef}
          className="overflow-hidden px-12 py-4"
        >
          <div
            ref={stripRef}
            style={{
              width: totalWidth,
              height: 280,
              position: 'relative',
              willChange: 'transform',
              transform: 'translate3d(0, 0, 0)',
            }}
          >
            {items.map((item, i) => (
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
                  focusKeyOverride={getCardFocusKey(rowIndex, i)}
                  onArrowPress={makeCardArrowPress(i)}
                  onFocused={makeCardFocused(i)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
});
