import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { mapKeyEvent } from '../utils/keyMap';
import { fetchContentDetail, fetchRubricList, fetchContentsByCategory } from '../services/api';
import { deliveryOrder, getSmartVideoDrmConfig } from '@digitalvirgo/drm-player';
import type { DrmConfig } from '@digitalvirgo/drm-player';
import { useAuth } from '../contexts/AuthContext';
import { RELATED_RUBRIC_ID } from '../constants/api';
import type { ContentItem, RubricItem } from '../types/api';
import { getArtBackground, getStreamUrl, getMainStreamUrl, getMainDeliveryDrm, sizedUrl } from '../utils/assets';
import { resolveBestHlsStream } from '../utils/hlsUtils';
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

  const handleArrowPress = useCallback((direction: string) => {
    if (direction === 'up') {
      setFocus('header');
      return false;
    }
    return true;
  }, []);

  const isDrm = content ? getMainDeliveryDrm(content.deliveries) : false;

  const handlePlay = useCallback(async () => {
    if (!content || !contentId) return;

    if (!user) {
      navigate('/login', { state: { returnTo: `/content/${contentId}` } });
      return;
    }

    if (!isDrm) {
      const mainUrl = getMainStreamUrl(content.deliveries);
      const trailerUrl = getStreamUrl(content.deliveries);
      setPlayerUrl(mainUrl || trailerUrl);
      setDrmConfig(undefined);
      setShowPlayer(true);
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
  }, [content, contentId, isDrm, user, navigate]);

  if (loading) return <LoadingSpinner />;
  if (!content) return <div className="p-12 text-white/60">Content not found.</div>;

  const rawBg = getArtBackground(content.assets);
  const heroBg = rawBg ? sizedUrl(rawBg, window.innerWidth, Math.round(window.innerHeight * 0.6)) : null;
  const playerPoster = rawBg ? sizedUrl(rawBg, window.innerWidth, window.innerHeight) : null;
  const trailerUrl = getStreamUrl(content.deliveries);
  const mainUrl = getMainStreamUrl(content.deliveries);
  const hasPlayableContent = !!(mainUrl || trailerUrl);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref}>
        {showPlayer && playerUrl && (
          <VideoPlayer
            url={playerUrl}
            poster={playerPoster ?? undefined}
            drm={drmConfig}
            onClose={() => setShowPlayer(false)}
          />
        )}

        <div className="relative w-full overflow-hidden" style={{ minHeight: '60vh' }}>
          {trailerUrl ? (
            <HeroTrailer src={trailerUrl} poster={heroBg} />
          ) : heroBg ? (
            <img
              src={heroBg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to top, #120818, rgba(18,8,24,0.5) 50%, rgba(18,8,24,0.3))' }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(18,8,24,0.8), transparent 50%, transparent)' }} />

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
              {drmError && (
                <p className="mb-2 text-sm text-red-400">{drmError}</p>
              )}
              <DetailActions>
                {hasPlayableContent && (
                  <PlayButton onPress={handlePlay} loading={drmLoading} onArrowPress={handleArrowPress} />
                )}
                <BackButton onPress={() => navigate(-1)} onArrowPress={handleArrowPress} />
              </DetailActions>
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

function DetailActions({ children }: { children: React.ReactNode }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'detail-actions',
    isFocusBoundary: false,
    trackChildren: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="mt-4 flex gap-3">
        {children}
      </div>
    </FocusContext.Provider>
  );
}

function PlayButton({ onPress, loading, onArrowPress }: { onPress: () => void; loading?: boolean; onArrowPress?: (direction: string) => boolean }) {
  const { ref, focused } = useFocusable({ onEnterPress: loading ? undefined : onPress, onArrowPress });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={loading ? undefined : onPress}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-lg font-medium text-black disabled:opacity-60"
      style={{
        transform: focused ? 'translate3d(0,0,0) scale(1.05)' : 'translate3d(0,0,0) scale(1)',
        boxShadow: focused ? '0 0 0 3px white, 0 10px 15px -3px rgba(255,255,255,0.2)' : 'none',
        transition: 'transform 200ms ease-out, box-shadow 200ms ease-out',
      }}
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
      {loading ? 'Loading...' : 'Play'}
    </button>
  );
}

function BackButton({ onPress, onArrowPress }: { onPress: () => void; onArrowPress?: (direction: string) => boolean }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress, onArrowPress });

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onPress}
      className="rounded-lg bg-white/15 px-8 py-3 text-lg font-medium text-white backdrop-blur-sm"
      style={{
        transform: focused ? 'translate3d(0,0,0) scale(1.05)' : 'translate3d(0,0,0) scale(1)',
        boxShadow: focused ? '0 0 0 3px white, 0 10px 15px -3px rgba(255,255,255,0.2)' : 'none',
        transition: 'transform 200ms ease-out, box-shadow 200ms ease-out',
      }}
    >
      Back
    </button>
  );
}

function HeroTrailer({ src, poster }: { src: string; poster: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import('hls.js').default | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;
    const isHls = src.includes('.m3u8');

    if (isHls) {
      const setup = async () => {
        const bestStream = await resolveBestHlsStream(src);
        if (cancelled) return;

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = bestStream;
          video.play().catch(() => {});
          return;
        }

        const { default: Hls } = await import('hls.js');
        if (cancelled || !Hls.isSupported()) return;

        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(bestStream);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      };
      setup();
    } else {
      video.src = src;
    }

    return () => {
      cancelled = true;
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
          decoding="async"
          style={{
            position: 'absolute',
            top: '50%',
            right: '5%',
            transform: 'translateY(-50%)',
            maxHeight: '80%',
            maxWidth: '45%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            opacity: videoReady ? 0 : 1,
            transition: 'opacity 800ms ease-out',
            zIndex: 1,
          }}
        />
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        onCanPlay={handleCanPlay}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          opacity: videoReady ? 1 : 0,
          transition: 'opacity 800ms ease-out',
        }}
      />
    </>
  );
}
