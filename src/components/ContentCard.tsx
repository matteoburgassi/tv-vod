import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import { getCoverImage, sizedUrl } from '../utils/assets';
import { isImageCached } from '../utils/imageCache';

interface ContentCardProps {
  item: ContentItem;
  showBadge?: boolean;
  focusKeyOverride?: string;
  onArrowPress?: (direction: string) => boolean;
  onFocused?: (el: HTMLDivElement) => void;
  virtualized?: boolean;
}

export default memo(function ContentCard({ item, showBadge = false, focusKeyOverride, onArrowPress, onFocused, virtualized = false }: ContentCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const onPress = useCallback(() => {
    navigate(`/content/${item.content_id}`);
  }, [navigate, item.content_id]);

  const { ref, focused } = useFocusable({
    focusKey: focusKeyOverride,
    onEnterPress: onPress,
    onArrowPress,
  });

  useEffect(() => {
    if (focused && cardRef.current && onFocused) {
      onFocused(cardRef.current);
    }
  }, [focused, onFocused]);

  const rawCover = getCoverImage(item.assets);
  const vw = window.innerWidth / 100;
  const cover = rawCover ? sizedUrl(rawCover, 9.375 * vw, 12.5 * vw) : null;
  const [loaded, setLoaded] = useState(() => (cover ? isImageCached(cover) : false));

  const shouldVirtualize = virtualized && !focused;

  useEffect(() => {
    if (shouldVirtualize || !cover || loaded) return;
    if (isImageCached(cover)) setLoaded(true);
  }, [cover, loaded, shouldVirtualize]);

  if (shouldVirtualize) {
    return (
      <div
        ref={(node) => {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={{ width: '9.375vw', height: '14.583vw' }}
      />
    );
  }

  return (
    <div
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className="shrink-0"
      style={{
        width: '9.375vw',
        height: '14.583vw',
        contain: 'layout style',
      }}
    >
      <div
        className="cursor-pointer"
        style={{
          transform: focused ? 'scale(1.1)' : 'scale(1)',
          transformOrigin: 'center center',
          transition: 'transform 200ms ease-out',
        }}
        onClick={onPress}
      >
        <div
          className="relative overflow-hidden rounded-lg bg-white/5"
          style={{
            width: '9.375vw',
            height: '12.5vw',
            border: focused ? '0.16vw solid white' : '0.16vw solid transparent',
            transition: 'border-color 200ms ease-out',
          }}
        >
          {cover ? (
            <>
              {!loaded && <div className="shimmer absolute inset-0" />}
              <img
                src={cover}
                alt={item.title}
                className="h-full w-full object-cover"
                loading={focused ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)}
                style={{
                  opacity: loaded ? 1 : 0,
                  transition: 'opacity 150ms ease-out',
                }}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/10">
              <span className="text-sm text-white/50">{item.title}</span>
            </div>
          )}
          {showBadge && item.content_type && (
            <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              {item.content_type}
            </span>
          )}
        </div>
        <p
          className="mt-2 truncate text-sm"
          style={{
            color: focused ? 'white' : 'rgba(255,255,255,0.7)',
            transition: 'color 200ms ease-out',
          }}
        >
          {item.title}
        </p>
      </div>
    </div>
  );
});
