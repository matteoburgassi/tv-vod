import { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { mapKeyEvent } from '../utils/keyMap';
import { usePlayer, PLAYER_CONTAINER_CLASS } from '@digitalvirgo/drm-player';
import type { DrmConfig } from '@digitalvirgo/drm-player';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  drm?: DrmConfig;
  onClose: () => void;
}

export default function VideoPlayer({ url, poster, drm, onClose }: VideoPlayerProps) {
  const { containerRef, state: playerState, play, pause: playerPause, resume: playerResume, seek: playerSeek } = usePlayer();
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showControlsRef = useRef(showControls);
  showControlsRef.current = showControls;

  const { ref, focusKey } = useFocusable({
    focusKey: 'video-player',
    isFocusBoundary: true,
    trackChildren: true,
  });

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const togglePlay = useCallback(() => {
    if (playerState.playing) {
      playerPause();
    } else {
      playerResume();
    }
  }, [playerState.playing, playerPause, playerResume]);

  const seekDelta = useCallback((delta: number) => {
    playerSeek(playerState.currentTime + delta);
  }, [playerSeek, playerState.currentTime]);

  const seekToRatio = useCallback((ratio: number) => {
    playerSeek(ratio * playerState.duration);
  }, [playerSeek, playerState.duration]);

  useEffect(() => {
    play({ url, drm, autoplay: true });
    resetHideTimer();
    setFocus('player-back');
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [url, poster, drm, play, resetHideTimer]);

  useEffect(() => {
    if (playerState.ended) onClose();
  }, [playerState.ended, onClose]);

  useEffect(() => {
    const interceptor = (e: KeyboardEvent) => {
      const action = mapKeyEvent(e);
      if (!action) return;

      if (action === 'back') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      const navActions = ['up', 'down', 'left', 'right', 'enter', 'play_pause'];

      if (!showControlsRef.current && navActions.includes(action)) {
        e.preventDefault();
        e.stopPropagation();
        resetHideTimer();
        setFocus('player-playpause');
        return;
      }

      if (action === 'play_pause') {
        e.preventDefault();
        e.stopPropagation();
        togglePlay();
        resetHideTimer();
        return;
      }

      if (action === 'rewind') {
        e.preventDefault();
        e.stopPropagation();
        seekDelta(-10);
        resetHideTimer();
        return;
      }

      if (action === 'fast_forward') {
        e.preventDefault();
        e.stopPropagation();
        seekDelta(10);
        resetHideTimer();
        return;
      }

      if (action === 'stop') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (navActions.includes(action)) {
        resetHideTimer();
      }
    };

    window.addEventListener('keydown', interceptor, { capture: true });
    return () => window.removeEventListener('keydown', interceptor, { capture: true });
  }, [onClose, resetHideTimer, togglePlay, seekDelta]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = playerState.duration ? playerState.currentTime / playerState.duration : 0;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="fixed inset-0 z-50 bg-black" style={{ transform: 'translate3d(0,0,0)' }} onMouseMove={resetHideTimer}>
        <div ref={containerRef} className={`${PLAYER_CONTAINER_CLASS} h-full w-full`} />

        {playerState.loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        )}

        {playerState.error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-red-900/80 px-8 py-4 text-center">
              <p className="text-lg text-white">{playerState.error}</p>
            </div>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 300ms ease-out',
          }}
        >
          <PlayerBackButton onClose={onClose} seek={seekDelta} />

          <div className="absolute inset-x-0 bottom-0 p-8 pt-20" style={{ backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
            <ProgressBar progress={progress} seek={seekDelta} onClickSeek={seekToRatio} />
            <div className="mt-4 flex items-center gap-6">
              <PlayPauseButton playing={playerState.playing} onToggle={togglePlay} seek={seekDelta} />
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function PlayerBackButton({ onClose, seek }: { onClose: () => void; seek: (delta: number) => void }) {
  const { ref, focused } = useFocusable({
    focusKey: 'player-back',
    onEnterPress: onClose,
    onArrowPress: (direction: string) => {
      if (direction === 'down') {
        setFocus('player-progress');
        return false;
      }
      if (direction === 'left') {
        seek(-10);
        return false;
      }
      if (direction === 'right') {
        seek(10);
        return false;
      }
      return false;
    },
  });

  return (
    <div className="absolute top-6 left-8 z-10">
      <button
        ref={ref}
        className="rounded-full p-3 text-white"
        style={{
          backgroundColor: focused ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
          transform: focused ? 'translate3d(0,0,0) scale(1.1)' : 'translate3d(0,0,0) scale(1)',
          transition: 'transform 150ms ease-out, background-color 150ms ease-out',
        }}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
      </button>
    </div>
  );
}

function ProgressBar({ progress, seek, onClickSeek }: { progress: number; seek: (delta: number) => void; onClickSeek: (ratio: number) => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const { ref, focused } = useFocusable({
    focusKey: 'player-progress',
    onArrowPress: (direction: string) => {
      if (direction === 'left') {
        seek(-10);
        return false;
      }
      if (direction === 'right') {
        seek(10);
        return false;
      }
      if (direction === 'up') {
        setFocus('player-back');
        return false;
      }
      if (direction === 'down') {
        setFocus('player-playpause');
        return false;
      }
      return false;
    },
  });

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onClickSeek(ratio);
  };

  return (
    <div
      ref={(node) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (barRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className="h-2 cursor-pointer overflow-hidden rounded-full"
      style={{
        backgroundColor: focused ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
        boxShadow: focused ? '0 0 0 2px rgba(255,255,255,0.6)' : 'none',
        transition: 'background-color 150ms ease-out, box-shadow 150ms ease-out',
      }}
      onClick={handleClick}
    >
      <div
        className="h-full rounded-full bg-white"
        style={{
          width: `${(progress * 100).toFixed(1)}%`,
          transition: 'width 200ms linear',
        }}
      />
    </div>
  );
}

function PlayPauseButton({
  playing,
  onToggle,
  seek,
}: {
  playing: boolean;
  onToggle: () => void;
  seek: (delta: number) => void;
}) {
  const { ref, focused } = useFocusable({
    focusKey: 'player-playpause',
    onEnterPress: onToggle,
    onArrowPress: (direction: string) => {
      if (direction === 'left') {
        seek(-10);
        return false;
      }
      if (direction === 'right') {
        seek(10);
        return false;
      }
      if (direction === 'up') {
        setFocus('player-progress');
        return false;
      }
      return false;
    },
  });

  return (
    <button
      ref={ref}
      className="rounded-full p-2 text-white"
      style={{
        backgroundColor: focused ? 'rgba(255,255,255,0.3)' : 'transparent',
        transform: focused ? 'translate3d(0,0,0) scale(1.1)' : 'translate3d(0,0,0) scale(1)',
        transition: 'transform 150ms ease-out, background-color 150ms ease-out',
      }}
    >
      {playing ? (
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
