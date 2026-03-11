import { useRef, useCallback, useState, useEffect } from 'react';
import { PlayerCore } from './PlayerCore';
import type { PlayRequest, PlayerState } from './types';
import { INITIAL_STATE } from './types';

export function usePlayer() {
  const coreRef = useRef<PlayerCore | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PlayerState>({ ...INITIAL_STATE });
  const attachedRef = useRef(false);

  useEffect(() => {
    const core = new PlayerCore();
    coreRef.current = core;

    const unsub = core.onStateChange(setState);

    return () => {
      unsub();
      core.destroy();
      coreRef.current = null;
      attachedRef.current = false;
    };
  }, []);

  const ensureAttached = useCallback(() => {
    if (!attachedRef.current && containerRef.current && coreRef.current) {
      coreRef.current.attach(containerRef.current);
      attachedRef.current = true;
    }
  }, []);

  const play = useCallback(async (request: PlayRequest) => {
    ensureAttached();
    await coreRef.current?.load(request);
  }, [ensureAttached]);

  const pause = useCallback(() => {
    coreRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    coreRef.current?.play();
  }, []);

  const seek = useCallback((seconds: number) => {
    coreRef.current?.seek(seconds);
  }, []);

  const destroy = useCallback(() => {
    coreRef.current?.destroy();
    attachedRef.current = false;
  }, []);

  return {
    containerRef,
    state,
    play,
    pause,
    resume,
    seek,
    destroy,
  };
}
