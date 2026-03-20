import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { mapKeyEvent } from '../utils/keyMap';
import { fetchContentDetail, fetchRubricList, fetchContentsByCategory } from '../services/api';
import { deliveryOrder, getSmartVideoDrmConfig } from '@digitalvirgo/drm-player';
import type { DrmConfig } from '@digitalvirgo/drm-player';
import { useAuth } from '../contexts/AuthContext';
import { RELATED_RUBRIC_ID } from '../constants/api';
import type { ContentItem, RubricItem } from '../types/api';
import { getArtBackground, getCoverImage, getStreamUrl, getMainStreamUrl, getMainDeliveryDrm, sizedUrl } from '../utils/assets';
import { resolveBestHlsStream } from '../utils/hlsUtils';
import { isTV } from '../utils/platformInit';
import VideoPlayer from '../components/VideoPlayer';
import ContentRow from '../components/ContentRow';
import LoadingSpinner from '../components/LoadingSpinner';

interface RelatedRow {
  rubric: RubricItem;
  items: ContentItem[];
}

const HEADER_SPACER_EXTRA_PX = 28;
/** Extra air below the fixed top bar on detail (trailer stays full-bleed). */
const DETAIL_TOP_GAP_MULTIPLIER = 2;

function measureHeaderSafePx(): number {
  const el = document.querySelector('header');
  if (!el) return 160;
  return Math.ceil(el.getBoundingClientRect().height) + HEADER_SPACER_EXTRA_PX;
}

export default function ContentDetailsPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [headerSpacerPx, setHeaderSpacerPx] = useState(160 * DETAIL_TOP_GAP_MULTIPLIER);
  const [content, setContent] = useState<ContentItem | null>(null);
  const [related, setRelated] = useState<RelatedRow[]>([]);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drmLoading, setDrmLoading] = useState(false);
  const [drmError, setDrmError] = useState<string | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [drmConfig, setDrmConfig] = useState<DrmConfig | undefined>();
  const { ref, focusKey } = useFocusable({});

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

  useLayoutEffect(() => {
    const sync = () => setHeaderSpacerPx(measureHeaderSafePx() * DETAIL_TOP_GAP_MULTIPLIER);
    sync();
    window.addEventListener('resize', sync);
    const t = window.setTimeout(sync, 0);
    const t2 = window.setTimeout(sync, 450);
    return () => {
      window.removeEventListener('resize', sync);
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      window.requestAnimationFrame(() => {
        setHeaderSpacerPx(measureHeaderSafePx() * DETAIL_TOP_GAP_MULTIPLIER);
        setFocus('detail-actions');
      });
    }
  }, [loading]);

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
  const rawCover = getCoverImage(content.assets);
  const vw = window.innerWidth / 100;
  const coverImg = rawCover ? sizedUrl(rawCover, 20 * vw, 28 * vw) : null;
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

        <div className="relative w-full min-h-[60vh] overflow-x-hidden">
          {heroBg ? (
            <img
              src={heroBg}
              alt=""
              className="absolute inset-0 z-0 h-full min-h-full w-full object-cover"
              decoding="async"
              fetchPriority="high"
            />
          ) : null}
          {trailerUrl ? <HeroTrailer src={trailerUrl} /> : null}
          <div
            className="pointer-events-none absolute inset-0 z-[6] min-h-full"
            style={{ backgroundImage: 'linear-gradient(to top, #120818, rgba(18,8,24,0.5) 50%, rgba(18,8,24,0.3))' }}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[6] min-h-full"
            style={{ backgroundImage: 'linear-gradient(to right, rgba(18,8,24,0.8), transparent 50%, transparent)' }}
          />

          <div className="relative z-10 w-full px-12 pb-16">
            <div
              className="w-full shrink-0"
              style={{ minHeight: headerSpacerPx }}
              aria-hidden
            />
            <div className="flex w-full flex-row items-stretch gap-8">
              <div className="flex min-w-0 flex-1 flex-col items-start justify-start gap-4 text-left">
                <h1 className="max-w-2xl break-words text-4xl leading-tight font-semibold text-white md:text-5xl md:leading-tight">
                  {content.title}
                </h1>
                {content.content_type && (
                  <span className="w-fit self-start rounded bg-white/15 px-3 py-1 text-sm text-white/80 backdrop-blur-sm">
                    {content.content_type}
                  </span>
                )}
                {content.description && (
                  <p className="max-w-2xl text-lg leading-relaxed text-white/70">
                    {content.description}
                  </p>
                )}
                {drmError && (
                  <p className="text-sm text-red-400">{drmError}</p>
                )}
                <DetailActions>
                  {hasPlayableContent && (
                    <PlayButton
                      onPress={handlePlay}
                      loading={drmLoading}
                      onArrowPress={handleArrowPress}
                      focusKey="detail-play"
                      arrowRightFocusKey="detail-back"
                    />
                  )}
                  <BackButton
                    onPress={() => navigate(-1)}
                    onArrowPress={handleArrowPress}
                    focusKey="detail-back"
                    arrowLeftFocusKey={hasPlayableContent ? 'detail-play' : undefined}
                  />
                </DetailActions>
              </div>

              {trailerUrl && coverImg ? (
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
                  <HeroCover src={coverImg} trailerUrl={trailerUrl} />
                </div>
              ) : null}
            </div>
          </div>
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

function PlayButton({
  onPress,
  loading,
  onArrowPress,
  focusKey,
  arrowRightFocusKey,
}: {
  onPress: () => void;
  loading?: boolean;
  onArrowPress?: (direction: string) => boolean;
  focusKey?: string;
  arrowRightFocusKey?: string;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: loading ? undefined : onPress,
    onArrowPress: (direction: string) => {
      if (direction === 'right' && arrowRightFocusKey) {
        setFocus(arrowRightFocusKey);
        return false;
      }
      return onArrowPress?.(direction) ?? true;
    },
  });

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

function BackButton({
  onPress,
  onArrowPress,
  focusKey,
  arrowLeftFocusKey,
}: {
  onPress: () => void;
  onArrowPress?: (direction: string) => boolean;
  focusKey?: string;
  arrowLeftFocusKey?: string;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onPress,
    onArrowPress: (direction: string) => {
      if (direction === 'left' && arrowLeftFocusKey) {
        setFocus(arrowLeftFocusKey);
        return false;
      }
      return onArrowPress?.(direction) ?? true;
    },
  });

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

let heroTrailerReady = false;
const trailerReadyListeners = new Set<() => void>();

function notifyTrailerReady() {
  heroTrailerReady = true;
  for (const fn of trailerReadyListeners) fn();
}

/** Shorter on TV so trailer appears sooner; desktop keeps polish delay. */
function minCoverVisibleMs(): number {
  return isTV() ? 900 : 2000;
}

function HeroTrailer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import('hls.js').default | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const loadStartedAtRef = useRef(0);
  const canPlayScheduledRef = useRef(false);
  const canPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTrailerReveal = useCallback(() => {
    if (canPlayScheduledRef.current) return;
    canPlayScheduledRef.current = true;
    const elapsed = Date.now() - loadStartedAtRef.current;
    const wait = Math.max(0, minCoverVisibleMs() - elapsed);
    canPlayTimerRef.current = setTimeout(() => {
      canPlayTimerRef.current = null;
      notifyTrailerReady();
    }, wait);
  }, []);

  useEffect(() => {
    heroTrailerReady = false;
    loadStartedAtRef.current = Date.now();
    canPlayScheduledRef.current = false;
    if (canPlayTimerRef.current) {
      clearTimeout(canPlayTimerRef.current);
      canPlayTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    const onReady = () => {
      setTimeout(() => setShowVideo(true), 600);
    };
    trailerReadyListeners.add(onReady);

    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;
    const isHls = src.includes('.m3u8');

    safetyTimerRef.current = setTimeout(() => {
      safetyTimerRef.current = null;
      if (!cancelled && !canPlayScheduledRef.current) {
        scheduleTrailerReveal();
      }
    }, 14000);

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
        if (cancelled) return;

        if (Hls.isSupported()) {
          const hlsConfig: Partial<import('hls.js').HlsConfig> = isTV()
            ? {
                maxBufferLength: 12,
                maxMaxBufferLength: 24,
                startFragPrefetch: true,
              }
            : {};
          const hls = new Hls(hlsConfig);
          hlsRef.current = hls;
          hls.loadSource(bestStream);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
        } else {
          video.src = bestStream;
          video.play().catch(() => {});
        }
      };
      setup();
    } else {
      video.src = src;
    }

    return () => {
      cancelled = true;
      trailerReadyListeners.delete(onReady);
      if (canPlayTimerRef.current) {
        clearTimeout(canPlayTimerRef.current);
        canPlayTimerRef.current = null;
      }
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, scheduleTrailerReveal]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        pointerEvents: 'none',
        opacity: showVideo ? 1 : 0,
        transition: 'opacity 800ms ease-out',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        // @ts-expect-error legacy WebKit
        webkit-playsinline=""
        onCanPlay={scheduleTrailerReveal}
        onLoadedData={scheduleTrailerReveal}
        onPlaying={scheduleTrailerReveal}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
}

function HeroCover({ src, trailerUrl }: { src: string; trailerUrl: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (heroTrailerReady) {
      setHidden(true);
      return;
    }
    const onReady = () => setHidden(true);
    trailerReadyListeners.add(onReady);
    return () => { trailerReadyListeners.delete(onReady); };
  }, [trailerUrl]);

  return (
    <div
      style={{
        pointerEvents: 'none',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 500ms ease-out',
        maxWidth: '100%',
      }}
    >
      <img
        src={src}
        alt=""
        decoding="async"
        fetchPriority="high"
        style={{
          maxHeight: '40vh',
          maxWidth: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          borderRadius: '0.75rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      />
    </div>
  );
}
