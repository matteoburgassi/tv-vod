import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import { getArtBackground, getHighlight, getHighlightTitle } from '../utils/assets';

interface HeroProps {
  items: ContentItem[];
  firstRowFocusKey?: string;
}

export default function Hero({ items, firstRowFocusKey }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { ref, focusKey } = useFocusable({
    focusKey: 'hero',
    isFocusBoundary: false,
    trackChildren: true,
  });

  const handleArrowPress = useCallback((direction: string) => {
    if (direction === 'up') {
      setFocus('header');
      return false;
    }
    if (direction === 'down' && firstRowFocusKey) {
      setFocus(firstRowFocusKey);
      return false;
    }
    return true;
  }, [firstRowFocusKey]);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [items.length]);

  const item = items[activeIndex];
  if (!item) return null;

  const bg = getArtBackground(item.assets) || getHighlight(item.assets);
  const titleImg = getHighlightTitle(item.assets);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="relative h-[70vh] min-h-[400px] w-full overflow-hidden">
        {bg && (
          <img
            src={bg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            key={item.content_id}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-transparent" />

        <div className="absolute bottom-16 left-12 z-10 max-w-2xl">
          {titleImg ? (
            <img
              src={titleImg}
              alt={item.title}
              className="mb-4 h-auto max-h-24 w-auto max-w-md object-contain"
            />
          ) : (
            <h1 className="mb-4 text-5xl leading-tight font-semibold text-white drop-shadow-lg">
              {item.title}
            </h1>
          )}
          {item.description && (
            <p className="mb-6 line-clamp-3 text-lg leading-relaxed text-white/80">
              {item.description}
            </p>
          )}
          <div className="flex gap-3">
            <HeroButton
              label="Watch"
              primary
              onPress={() => navigate(`/content/${item.content_id}`)}
              onArrowPress={handleArrowPress}
            />
            <HeroButton
              label="More Info"
              onPress={() => navigate(`/content/${item.content_id}`)}
              onArrowPress={handleArrowPress}
            />
          </div>
        </div>

        {items.length > 1 && (
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-8 bg-white' : 'w-3 bg-white/30'
                }`}
                onClick={() => setActiveIndex(i)}
                tabIndex={-1}
              />
            ))}
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}

function HeroButton({
  label,
  primary = false,
  onPress,
  onArrowPress,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
  onArrowPress?: (direction: string) => boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { ref, focused } = useFocusable({ onEnterPress: onPress, onArrowPress });

  useEffect(() => {
    if (focused && btnRef.current) {
      btnRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [focused]);

  return (
    <button
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        (btnRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }}
      onClick={onPress}
      className={`
        rounded-lg px-8 py-3 text-lg font-medium transition-all duration-200
        ${primary
          ? 'bg-white text-black hover:bg-white/90'
          : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
        }
        ${focused ? 'ring-3 ring-white scale-105 shadow-lg shadow-white/20' : ''}
      `}
    >
      {label}
    </button>
  );
}
