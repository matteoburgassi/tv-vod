import { memo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import { getCoverImage } from '../utils/assets';

interface ContentCardProps {
  item: ContentItem;
  showBadge?: boolean;
  onArrowPress?: (direction: string) => boolean;
}

export default memo(function ContentCard({ item, showBadge = false, onArrowPress }: ContentCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const onPress = useCallback(() => {
    navigate(`/content/${item.content_id}`);
  }, [navigate, item.content_id]);

  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
    onArrowPress,
  });

  useEffect(() => {
    if (focused && cardRef.current) {
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    }
  }, [focused]);

  const cover = getCoverImage(item.assets);

  return (
    <div
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className="group shrink-0 cursor-pointer"
      style={{
        width: 180,
        contain: 'layout style paint',
        transform: focused ? 'translate3d(0,0,0) scale(1.1)' : 'translate3d(0,0,0) scale(1)',
        transition: 'transform 200ms ease-out',
        willChange: 'transform',
      }}
      onClick={onPress}
    >
      <div
        className="relative overflow-hidden rounded-lg"
        style={{
          aspectRatio: '3/4',
          border: focused ? '3px solid white' : '3px solid transparent',
          transition: 'border-color 200ms ease-out',
        }}
      >
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
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
  );
});
