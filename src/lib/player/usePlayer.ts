import { useRef, useCallback, useState, useEffect } from 'react';
import { PlayerCore } from './PlayerCore';
import type { PlayRequest, PlayerState } from './types';
import { INITIAL_STATE } from './types';

export function usePlayer() {
  const coreRef = useRef<PlayerCore | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node && coreRef.current) {
      coreRef.current.attach(node);
    }
  }, []);
  const [state, setState] = useState<PlayerState>({ ...INITIAL_STATE });
  const pendingRequest = useRef<PlayRequest | null>(null);

  useEffect(() => {
    const core = new PlayerCore();
    coreRef.current = core;
    const unsub = core.onStateChange(setState);

    return () => {
      unsub();
      core.destroy();
      coreRef.current = null;
    };
  }, []);

  const play = useCallback(async (request: PlayRequest) => {
    const core = coreRef.current;
    if (!core) return;

    if (!core.isAttached()) {
      pendingRequest.current = request;
      return;
    }

    await core.load(request);
  }, []);

  const flushPending = useCallback(async () => {
    if (pendingRequest.current && coreRef.current?.isAttached()) {
      const req = pendingRequest.current;
      pendingRequest.current = null;
      await coreRef.current.load(req);
    }
  }, []);

  const containerCallback = useCallback((node: HTMLDivElement | null) => {
    if (node && coreRef.current) {
      coreRef.current.attach(node);
      flushPending();
    }
  }, [flushPending]);

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
  }, []);

  return {
    containerRef: containerCallback,
    state,
    play,
    pause,
    resume,
    seek,
    destroy,
  };
}
