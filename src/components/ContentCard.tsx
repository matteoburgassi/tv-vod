import { useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import type { ContentItem } from '../types/api';
import { getCoverImage } from '../utils/assets';

interface ContentCardProps {
  item: ContentItem;
  showBadge?: boolean;
}

export default function ContentCard({ item, showBadge = false }: ContentCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const onPress = useCallback(() => {
    navigate(`/content/${item.content_id}`);
  }, [navigate, item.content_id]);

  const { ref, focused } = useFocusable({
    onEnterPress: onPress,
  });

  useEffect(() => {
    if (focused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
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
      style={{ width: 180 }}
      onClick={onPress}
    >
      <div
        className={`
          relative overflow-hidden rounded-lg transition-all duration-200
          ${focused ? 'scale-110 ring-3 ring-white shadow-lg shadow-white/20' : 'scale-100 ring-0'}
        `}
        style={{ aspectRatio: '3/4' }}
      >
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
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
        className={`
          mt-2 truncate text-sm transition-colors duration-200
          ${focused ? 'text-white' : 'text-white/70'}
        `}
      >
        {item.title}
      </p>
    </div>
  );
}
