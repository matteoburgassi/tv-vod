import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';
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

const CARD_W_VW = 9.375;
const CARD_GAP_VW = 0.833;
const SCROLL_PAD_VW = 2.5;
const CARD_H_VW = 14.583;
const CARD_STEP_VW = CARD_W_VW + CARD_GAP_VW;
const ANIM_DURATION = 120;
const VIRTUALIZE_BUFFER = 4;

/** Which card indices should render real thumbnails for a horizontal offset (px) and row viewport width. */
function visibleIndexRange(
  itemCount: number,
  viewportWidthPx: number,
  horizontalOffsetPx: number,
): [number, number] {
  if (itemCount <= 0) return [0, 0];
  const vw = window.innerWidth / 100;
  const cardWPx = CARD_W_VW * vw;
  const cardGapPx = CARD_GAP_VW * vw;
  const cardStep = cardWPx + cardGapPx;
  const viewStart = Math.floor(Math.max(0, -horizontalOffsetPx) / cardStep);
  const viewEnd = Math.ceil((-horizontalOffsetPx + viewportWidthPx) / cardStep);
  return [
    Math.max(0, viewStart - VIRTUALIZE_BUFFER),
    Math.min(itemCount - 1, viewEnd + VIRTUALIZE_BUFFER),
  ];
}

/** SSR-safe guess before container is measured (avoids mounting ~15 imgs per row at once). */
function initialVisibleRangeGuess(itemCount: number): [number, number] {
  if (itemCount <= 0) return [0, 0];
  if (typeof window === 'undefined') return [0, Math.min(5, itemCount - 1)];
  const vw = window.innerWidth / 100;
  const cardStep = (CARD_W_VW + CARD_GAP_VW) * vw;
  const approxViewport = Math.max(160, window.innerWidth - SCROLL_PAD_VW * vw * 4);
  const viewEnd = Math.ceil(approxViewport / cardStep);
  const hi = Math.min(itemCount - 1, viewEnd + VIRTUALIZE_BUFFER);
  return [0, Math.max(0, hi)];
}

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
  const [visibleRange, setVisibleRange] = useState<[number, number]>(() =>
    initialVisibleRangeGuess(items.length),
  );

  const pendingFocusRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !items.length) return;

    const syncRange = () => {
      setVisibleRange(
        visibleIndexRange(items.length, container.clientWidth, offsetRef.current),
      );
    };

    syncRange();
    const ro = new ResizeObserver(() => {
      syncRange();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [items.length]);

  const handleCardFocused = useCallback((el: HTMLDivElement, cardIndex: number) => {
    focusedCardIndexRef.current = cardIndex;
    cancelAnimationFrame(pendingFocusRef.current);

    pendingFocusRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      const strip = stripRef.current;
      if (!container || !strip) return;

      const vw = window.innerWidth / 100;
      const scrollPadPx = SCROLL_PAD_VW * vw;
      const cardWPx = CARD_W_VW * vw;
      const cardGapPx = CARD_GAP_VW * vw;

      const viewportWidth = container.clientWidth;
      const currentOffset = offsetRef.current;

      const wrapper = el.parentElement as HTMLElement | null;
      const cardLeft = wrapper ? wrapper.offsetLeft : el.offsetLeft;
      const cardRight = cardLeft + (wrapper ? wrapper.offsetWidth : el.offsetWidth);

      const visibleLeft = -currentOffset + scrollPadPx;
      const visibleRight = -currentOffset + viewportWidth - scrollPadPx;

      let newOffset = currentOffset;

      if (cardLeft < visibleLeft) {
        newOffset = -(cardLeft - scrollPadPx);
      } else if (cardRight > visibleRight) {
        newOffset = -(cardRight - viewportWidth + scrollPadPx);
      }

      const totalWidth = items.length * cardWPx + (items.length - 1) * cardGapPx;
      const maxOffset = 0;
      const scrollableWidth = totalWidth + scrollPadPx * 2;
      const minOffset = scrollableWidth > viewportWidth
        ? -(scrollableWidth - viewportWidth)
        : 0;
      newOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

      setVisibleRange(visibleIndexRange(items.length, viewportWidth, newOffset));

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

      const headerThreshold = 4.167 * vw;
      const bottomPad = 1.042 * vw;
      const rowEl = container.closest('[data-content-row]');
      if (rowEl) {
        const rect = rowEl.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const scrollEl = document.getElementById('page-scroll-container');
        if (scrollEl) {
          let delta = 0;
          if (rect.top < headerThreshold) {
            delta = rect.top - headerThreshold;
          } else if (rect.bottom > viewportH) {
            delta = rect.bottom - viewportH + bottomPad;
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

  const totalWidthVw = items.length * CARD_W_VW + (items.length - 1) * CARD_GAP_VW;

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
              width: `${totalWidthVw}vw`,
              height: `${CARD_H_VW}vw`,
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
                  left: `${i * CARD_STEP_VW}vw`,
                  top: 0,
                  width: `${CARD_W_VW}vw`,
                }}
              >
                <ContentCard
                  item={item}
                  showBadge={showBadge}
                  focusKeyOverride={getCardFocusKey(rowIndex, i)}
                  onArrowPress={makeCardArrowPress(i)}
                  onFocused={makeCardFocused(i)}
                  virtualized={i < visibleRange[0] || i > visibleRange[1]}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
});
