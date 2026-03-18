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
  onArrowPress?: (direction: string) => boolean;
}

const CARD_WIDTH = 180;
const CARD_GAP = 16;
const SCROLL_PADDING = 48;
const ANIM_DURATION = 120;

export default memo(function ContentRow({ title, items, showBadge = false, focusKeyOverride, onArrowPress }: ContentRowProps) {
  const { ref, focusKey, focusSelf, hasFocusedChild } = useFocusable({
    focusKey: focusKeyOverride,
    trackChildren: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const animKeyRef = useRef({});
  const vertAnimKeyRef = useRef({});

  const handleCardFocused = useCallback((el: HTMLDivElement) => {
    const container = containerRef.current;
    const strip = stripRef.current;
    if (!container || !strip) return;

    const viewportWidth = container.clientWidth;
    const currentOffset = offsetRef.current;

    const cardLeft = el.offsetLeft;
    const cardRight = cardLeft + el.offsetWidth;

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
    const minOffset = -(totalWidth - viewportWidth + SCROLL_PADDING * 2);
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
        let targetTop: number | null = null;
        if (rect.top < 80) {
          targetTop = scrollEl.scrollTop + rect.top - 80;
        } else if (rect.bottom > viewportH - 40) {
          targetTop = scrollEl.scrollTop + rect.bottom - viewportH + 40;
        }
        if (targetTop !== null) {
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
  }, [items.length]);

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
                  onArrowPress={onArrowPress}
                  onFocused={handleCardFocused}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
});
