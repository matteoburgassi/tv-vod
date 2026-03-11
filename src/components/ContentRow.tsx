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

export default function ContentRow({ title, items, showBadge = false, focusKeyOverride, onArrowPress }: ContentRowProps) {
  const { ref, focusKey, focusSelf, hasFocusedChild } = useFocusable({
    focusKey: focusKeyOverride,
    trackChildren: true,
  });

  if (!items.length) return null;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="mb-4" onClick={() => focusSelf()}>
        <h2
          className={`
            mb-3 px-12 text-xl font-semibold transition-colors duration-200
            ${hasFocusedChild ? 'text-white' : 'text-white/60'}
          `}
        >
          {title}
        </h2>
        <div
          className="flex gap-4 overflow-x-auto px-12 py-4"
          style={{ scrollPaddingInline: '3rem' }}
        >
          {items.map((item) => (
            <ContentCard key={item.content_id} item={item} showBadge={showBadge} onArrowPress={onArrowPress} />
          ))}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
