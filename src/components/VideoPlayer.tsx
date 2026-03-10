import { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusable, FocusContext, setFocus } from '@noriginmedia/norigin-spatial-navigation';
import { mapKeyEvent } from '../utils/keyMap';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  onClose: () => void;
}

export default function VideoPlayer({ url, poster, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const seek = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
  }, []);

  const seekToRatio = useCallback((ratio: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = ratio * video.duration;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.play().catch(() => setPlaying(false));
    resetHideTimer();
    setFocus('player-back');
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

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
        seek(-10);
        resetHideTimer();
        return;
      }

      if (action === 'fast_forward') {
        e.preventDefault();
        e.stopPropagation();
        seek(10);
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
  }, [onClose, resetHideTimer, togglePlay, seek]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="fixed inset-0 z-50 bg-black" onMouseMove={resetHideTimer}>
        <video
          ref={videoRef}
          src={url}
          poster={poster}
          className="h-full w-full object-contain"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={onClose}
        />

        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <PlayerBackButton onClose={onClose} seek={seek} />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-8 pt-20">
            <ProgressBar progress={progress} seek={seek} onClickSeek={seekToRatio} />
            <div className="mt-4 flex items-center gap-6">
              <PlayPauseButton playing={playing} onToggle={togglePlay} seek={seek} />
              <span className="text-sm text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
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
        className={`rounded-full p-3 text-white transition-all ${
          focused ? 'scale-110 bg-white/30' : 'bg-white/10 hover:bg-white/20'
        }`}
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
      className={`h-2 cursor-pointer rounded-full transition-all ${
        focused ? 'bg-white/40 ring-2 ring-white/60' : 'bg-white/20'
      }`}
      onClick={handleClick}
    >
      <div
        className="h-full rounded-full bg-white transition-all"
        style={{ width: `${progress}%` }}
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
      className={`rounded-full p-2 text-white transition-all ${
        focused ? 'scale-110 bg-white/30' : 'hover:bg-white/20'
      }`}
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
