import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { mapKeyEvent } from '../utils/keyMap';
import { fetchContentDetail, fetchRubricList, fetchContentsByCategory } from '../services/api';
import { deliveryOrder, getSmartVideoDrmConfig } from '@digitalvirgo/drm-player';
import type { DrmConfig } from '@digitalvirgo/drm-player';
import { useAuth } from '../contexts/AuthContext';
import { RELATED_RUBRIC_ID } from '../constants/api';
import type { ContentItem, RubricItem } from '../types/api';
import { getArtBackground, getStreamUrl, getMainStreamUrl, getMainDeliveryDrm } from '../utils/assets';
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
  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [related, setRelated] = useState<RelatedRow[]>([]);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drmLoading, setDrmLoading] = useState(false);
  const [drmError, setDrmError] = useState<string | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [drmConfig, setDrmConfig] = useState<DrmConfig | undefined>();
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
      if (mapKeyEvent(e) === 'back') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate, showPlayer]);

  const isDrm = content ? getMainDeliveryDrm(content.deliveries) : false;

  const handlePlay = useCallback(async () => {
    if (!content || !contentId) return;

    if (!isDrm) {
      const mainUrl = getMainStreamUrl(content.deliveries);
      const trailerUrl = getStreamUrl(content.deliveries);
      setPlayerUrl(mainUrl || trailerUrl);
      setDrmConfig(undefined);
      setShowPlayer(true);
      return;
    }

    if (!user) {
      setDrmError('Login required for DRM content');
      return;
    }

    setDrmLoading(true);
    setDrmError(null);

    try {
      const order = await deliveryOrder(user.id, Number(contentId));
      if (!order?.orderId) {
        throw new Error('Could not obtain delivery order');
      }

      const tokenUrl = getMainStreamUrl(content.deliveries) ?? '';

      const smartVideo = await getSmartVideoDrmConfig({
        userId: user.id,
        galaxyRef: Number(contentId),
        tokenUrl,
        orderId: order.orderId,
      });

      setPlayerUrl(smartVideo.stream);
      setDrmConfig({
        merchant: 'digitalvirgo',
        userId: user.id,
        sessionId: smartVideo.sessionId,
        assetId: smartVideo.assets.stream,
        authToken: smartVideo.drm.stream,
      });
      setShowPlayer(true);
    } catch (err: any) {
      console.error('DRM setup failed:', err);
      setDrmError(err.message || 'Failed to load DRM content');
    } finally {
      setDrmLoading(false);
    }
  }, [content, contentId, isDrm, user]);

  if (loading) return <LoadingSpinner />;
  if (!content) return <div className="p-12 text-white/60">Content not found.</div>;

  const bg = getArtBackground(content.assets);
  const trailerUrl = getStreamUrl(content.deliveries);
  const mainUrl = getMainStreamUrl(content.deliveries);
  const hasPlayableContent = !!(mainUrl || trailerUrl);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>
        {showPlayer && playerUrl && (
          <VideoPlayer
            url={playerUrl}
            poster={bg ?? undefined}
            drm={drmConfig}
            onClose={() => setShowPlayer(false)}
          />
        )}

        <div className="relative min-h-[60vh] w-full overflow-hidden">
          {trailerUrl ? (
            <HeroTrailer src={trailerUrl} poster={bg} />
          ) : bg ? (
            <img
              src={bg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
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
              {isDrm && !user && (
                <p className="mb-2 text-sm text-yellow-400">Login required to play this content</p>
              )}
              {drmError && (
                <p className="mb-2 text-sm text-red-400">{drmError}</p>
              )}
              <div className="mt-4 flex gap-3">
                {hasPlayableContent && (
                  <PlayButton onPress={handlePlay} loading={drmLoading} />
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

function PlayButton({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { ref, focused } = useFocusable({ onEnterPress: loading ? undefined : onPress });

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
      onClick={loading ? undefined : onPress}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-lg font-medium text-black transition-all duration-200 hover:bg-white/90 disabled:opacity-60 ${
        focused ? 'ring-3 ring-white scale-105 shadow-lg shadow-white/20' : ''
      }`}
    >
      {loading ? (
        <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
      {loading ? 'Loading…' : 'Play'}
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

function HeroTrailer({ src, poster }: { src: string; poster: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import('hls.js').default | null>(null);
  const [loaded, setLoaded] = useState(false);

  const handleCanPlay = useCallback(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isHls = src.includes('.m3u8');

    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) return;
        const hls = new Hls({ startLevel: -1 });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      });
    } else {
      video.src = src;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  return (
    <>
      {poster && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster={poster ?? undefined}
        onCanPlay={handleCanPlay}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
}
