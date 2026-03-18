import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import { getArtBackground, getHighlight, getHighlightTitle, sizedUrl } from '../utils/assets';
import { animateValue } from '../utils/smoothScroll';

interface HeroProps {
  items: ContentItem[];
  firstRowFocusKey?: string;
}

export default function Hero({ items, firstRowFocusKey }: HeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { ref, focusKey, hasFocusedChild } = useFocusable({
    focusKey: 'hero',
    isFocusBoundary: false,
    trackChildren: true,
  });

  const heroAnimKey = useRef({});

  useEffect(() => {
    if (hasFocusedChild) {
      requestAnimationFrame(() => {
        const scrollEl = document.getElementById('page-scroll-container');
        if (scrollEl) {
          animateValue(heroAnimKey.current, scrollEl.scrollTop, 0, 120, (v) => {
            scrollEl.scrollTop = v;
          });
        }
      });
    }
  }, [hasFocusedChild]);

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

  const rawBg = getArtBackground(item.assets) || getHighlight(item.assets);
  const bg = rawBg ? sizedUrl(rawBg, window.innerWidth, Math.round(window.innerHeight * 0.7)) : null;
  const rawTitleImg = getHighlightTitle(item.assets);
  const titleImg = rawTitleImg ? sizedUrl(rawTitleImg, Math.round(window.innerWidth * 0.4), Math.round(window.innerWidth * 0.15)) : null;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={(node) => {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          (heroRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className="relative h-[70vh] min-h-[20.83vw] w-full overflow-hidden"
        style={{ contain: 'layout style' }}
      >
        {bg && (
          <img
            src={bg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transition: 'opacity 700ms ease-out' }}
            key={item.content_id}
            decoding="async"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#120818] via-[#120818]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#120818]/80 via-transparent to-transparent" />

        <div className="absolute bottom-[3.3vw] left-[2.5vw] z-10 max-w-[45vw]">
          {titleImg ? (
            <img
              src={titleImg}
              alt={item.title}
              className="mb-[0.8vw] h-auto max-h-[15vw] w-auto max-w-[40vw] object-contain object-left-bottom"
              decoding="async"
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
          <div className="absolute bottom-6 left-1/2 z-10 flex gap-2" style={{ transform: 'translate3d(-50%,0,0)' }}>
            {items.map((_, i) => (
              <button
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  width: i === activeIndex ? '1.667vw' : '0.625vw',
                  backgroundColor: i === activeIndex ? 'white' : 'rgba(255,255,255,0.3)',
                  transition: 'width 300ms ease-out, background-color 300ms ease-out',
                }}
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

  return (
    <button
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        (btnRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }}
      onClick={onPress}
      className={`rounded-lg px-8 py-3 text-lg font-medium ${
        primary
          ? 'bg-white text-black'
          : 'bg-white/15 text-white backdrop-blur-sm'
      }`}
      style={{
        transform: focused ? 'translate3d(0,0,0) scale(1.05)' : 'translate3d(0,0,0) scale(1)',
        transition: 'transform 200ms ease-out, box-shadow 200ms ease-out',
        boxShadow: focused ? '0 0 0 3px white, 0 10px 15px -3px rgba(255,255,255,0.2)' : 'none',
      }}
    >
      {label}
    </button>
  );
}
