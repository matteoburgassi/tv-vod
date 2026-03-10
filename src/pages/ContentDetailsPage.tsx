import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { fetchContentDetail, fetchRubricList, fetchContentsByCategory } from '../services/api';
import { RELATED_RUBRIC_ID } from '../constants/api';
import type { ContentItem, RubricItem } from '../types/api';
import { getArtBackground, getStreamUrl } from '../utils/assets';
import VideoPlayer from '../components/VideoPlayer';
import ContentRow from '../components/ContentRow';
import LoadingSpinner from '../components/LoadingSpinner';

interface RelatedRow {
  rubric: RubricItem;
  items: ContentItem[];
}

export default function ContentDetailsPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [related, setRelated] = useState<RelatedRow[]>([]);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loading, setLoading] = useState(true);
  const { ref, focusKey, focusSelf } = useFocusable({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!contentId) return;
      setLoading(true);
      setContent(null);
      setRelated([]);
      setShowPlayer(false);

      try {
        const [detail, rubrics] = await Promise.all([
          fetchContentDetail(Number(contentId)),
          fetchRubricList(RELATED_RUBRIC_ID),
        ]);

        if (cancelled) return;
        setContent(detail);

        const rows: RelatedRow[] = [];
        const results = await Promise.all(
          rubrics.map(async (rubric) => {
            const items = await fetchContentsByCategory(String(rubric.rubric_id));
            return { rubric, items };
          }),
        );
        rows.push(...results.filter((r) => r.items.length > 0));
        if (!cancelled) setRelated(rows);
      } catch (err) {
        console.error('Failed to load content:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [contentId]);

  useEffect(() => {
    if (!loading) focusSelf();
  }, [loading, focusSelf]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showPlayer) return;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate, showPlayer]);

  if (loading) return <LoadingSpinner />;
  if (!content) return <div className="p-12 text-white/60">Content not found.</div>;

  const bg = getArtBackground(content.assets);
  const streamUrl = getStreamUrl(content.deliveries);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>
        {showPlayer && streamUrl && (
          <VideoPlayer
            url={streamUrl}
            poster={bg ?? undefined}
            onClose={() => setShowPlayer(false)}
          />
        )}

        <div className="relative min-h-[60vh] w-full overflow-hidden">
          {bg && (
            <img
              src={bg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-[#0a0a0a]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-transparent" />

          <div className="relative z-10 flex min-h-[60vh] items-end px-12 pb-16 pt-32">
            <div className="max-w-2xl">
              <h1 className="mb-4 text-4xl font-semibold text-white md:text-5xl">
                {content.title}
              </h1>
              {content.content_type && (
                <span className="mb-4 inline-block rounded bg-white/15 px-3 py-1 text-sm text-white/80 backdrop-blur-sm">
                  {content.content_type}
                </span>
              )}
              <div className="mt-4 flex gap-3">
                {streamUrl && (
                  <PlayButton onPress={() => setShowPlayer(true)} />
                )}
                <BackButton onPress={() => navigate(-1)} />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-8 px-12 pb-8">
          <p className="max-w-3xl text-lg leading-relaxed text-white/70">
            {content.description}
          </p>
        </div>

        <div className="relative z-10 pb-20">
          {related.map((row) => (
            <ContentRow
              key={row.rubric.rubric_id}
              title={row.rubric.rubric_title}
              items={row.items}
            />
          ))}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function PlayButton({ onPress }: { onPress: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { ref, focused } = useFocusable({ onEnterPress: onPress });

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
      className={`flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-lg font-medium text-black transition-all duration-200 hover:bg-white/90 ${
        focused ? 'ring-3 ring-white scale-105 shadow-lg shadow-white/20' : ''
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
        <path d="M8 5v14l11-7z" />
      </svg>
      Play
    </button>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { ref, focused } = useFocusable({ onEnterPress: onPress });

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
      className={`rounded-lg bg-white/15 px-8 py-3 text-lg font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25 ${
        focused ? 'ring-3 ring-white scale-105 shadow-lg shadow-white/20' : ''
      }`}
    >
      Back
    </button>
  );
}
