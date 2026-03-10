import { useRef, useEffect, useCallback } from 'react';
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
}

export default function ContentRow({ title, items, showBadge = false }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { ref, focusKey, focusSelf, hasFocusedChild } = useFocusable({
    trackChildren: true,
  });

  const onChildFocused = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const focused = container.querySelector('[class*="scale-110"]');
    if (focused) {
      const el = focused.closest('[style*="width"]') as HTMLElement | null;
      if (el) {
        const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
    }
  }, []);

  useEffect(() => {
    if (hasFocusedChild) {
      const timer = setTimeout(onChildFocused, 50);
      return () => clearTimeout(timer);
    }
  }, [hasFocusedChild, onChildFocused]);

  if (!items.length) return null;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="mb-8" onClick={() => focusSelf()}>
        <h2
          className={`
            mb-3 px-12 text-xl font-semibold transition-colors duration-200
            ${hasFocusedChild ? 'text-white' : 'text-white/60'}
          `}
        >
          {title}
        </h2>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-12 scrollbar-none"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((item) => (
            <ContentCard key={item.content_id} item={item} showBadge={showBadge} />
          ))}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
