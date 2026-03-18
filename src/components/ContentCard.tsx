import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import { getCoverImage } from '../utils/assets';
import { isImageCached, preloadImage } from '../utils/imageCache';

interface ContentCardProps {
  item: ContentItem;
  showBadge?: boolean;
  focusKeyOverride?: string;
  onArrowPress?: (direction: string) => boolean;
  onFocused?: (el: HTMLDivElement) => void;
}

export default memo(function ContentCard({ item, showBadge = false, focusKeyOverride, onArrowPress, onFocused }: ContentCardProps) {
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

  const cover = getCoverImage(item.assets);
  const [loaded, setLoaded] = useState(() => (cover ? isImageCached(cover) : false));

  useEffect(() => {
    if (!cover || loaded) return;
    preloadImage(cover).then(() => setLoaded(true)).catch(() => {});
  }, [cover, loaded]);

  return (
    <div
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className="shrink-0"
      style={{
        width: 180,
        height: 280,
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
            width: 180,
            height: 240,
            border: focused ? '3px solid white' : '3px solid transparent',
            transition: 'border-color 200ms ease-out',
          }}
        >
          {cover ? (
            <>
              {!loaded && <div className="shimmer absolute inset-0" />}
              <img
                src={cover}
                alt={item.title}
                width={180}
                height={240}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
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
