import type { PlayerEngine, PlayRequest, PlayerState, StateListener } from '../types';
import { INITIAL_STATE } from '../types';

let installed = false;
let clppModule: any = null;

async function ensureInstalled() {
  if (installed) return;

  try {
    clppModule = await import('@castlabs/prestoplay');
    await import('@castlabs/prestoplay/cl.mse');
    await import('@castlabs/prestoplay/cl.dash');
    await import('@castlabs/prestoplay/cl.hls');
    await import('@castlabs/prestoplay/cl.crypto');
    await import('@castlabs/prestoplay/cl.onboard');

    const { clpp } = clppModule;
    clpp.install(clpp.dash.DashComponent);
    clpp.install(clpp.hls.HlsComponent);
    clpp.install(clpp.onboard.OnboardComponent);

    installed = true;
  } catch (e) {
    console.error('[DrmEngine] Failed to load CastLabs SDK:', e);
    throw new Error('@castlabs/prestoplay is not installed. DRM playback requires the CastLabs SDK.');
  }
}

const DRM_BASE_URLS: Record<string, string> = {
  DRMtoday: 'https://lic.drmtoday.com/license-proxy-headerauth/drmtoday/RightsManager.asmx',
  DRMtoday_STAGING: 'https://lic.staging.drmtoday.com/license-proxy-headerauth/drmtoday/RightsManager.asmx',
};

export class DrmEngine implements PlayerEngine {
  private player: any = null;
  private videoEl: HTMLVideoElement | null = null;
  private state: PlayerState = { ...INITIAL_STATE };
  private listeners = new Set<StateListener>();
  private timeInterval: ReturnType<typeof setInterval> | null = null;

  attach(container: HTMLElement): void {
    if (!container) throw new Error('DrmEngine.attach: container is null');
    this.videoEl = document.createElement('video');
    this.videoEl.id = `drm-video-${Date.now()}`;
    this.videoEl.style.width = '100%';
    this.videoEl.style.height = '100%';
    this.videoEl.style.objectFit = 'contain';
    this.videoEl.playsInline = true;
    container.appendChild(this.videoEl);
  }

  async load(request: PlayRequest): Promise<void> {
    if (!this.videoEl) throw new Error('Engine not attached');
    if (!request.drm) throw new Error('DRM config required for DrmEngine');

    this.updateState({ loading: true, error: null, ended: false });

    try {
      await ensureInstalled();

      const { clpp } = clppModule;

      if (this.player) {
        await this.player.release();
      }

      this.player = new clpp.Player(this.videoEl);
      this.bindPlayerEvents(clpp);

      const drmEnv = import.meta.env.VITE_DRM_ENV || 'DRMtoday_STAGING';
      const baseUrl = import.meta.env.VITE_DRM_BASE_URL || DRM_BASE_URLS[drmEnv] || DRM_BASE_URLS.DRMtoday_STAGING;

      const sourceType = this.detectSourceType(request.url);

      const config: any = {
        source: {
          url: request.url,
          type: sourceType,
          drmProtected: true,
        },
        autoplay: request.autoplay !== false,
        muted: request.muted ?? false,
        drm: {
          env: drmEnv,
          customData: {
            merchant: request.drm.merchant,
            userId: request.drm.userId,
            sessionId: request.drm.sessionId,
            baseUrl,
          },
        },
      };

      if (request.drm.authToken) {
        config.drm.customData.authToken = request.drm.authToken;
      }

      if (request.poster) {
        this.videoEl.poster = request.poster;
      }

      await this.player.load(config);
    } catch (err: any) {
      const message = this.mapError(err);
      this.updateState({ error: message, loading: false, playing: false });
    }
  }

  play(): void {
    this.player?.play();
  }

  pause(): void {
    this.player?.pause();
  }

  seek(seconds: number): void {
    if (this.player) {
      const duration = this.player.getDuration?.() || 0;
      this.player.seekTo(Math.max(0, Math.min(duration, seconds)));
    }
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  onStateChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }

    if (this.player) {
      try {
        this.player.destroy();
      } catch {
        // ignore destroy errors
      }
      this.player = null;
    }

    if (this.videoEl) {
      this.videoEl.remove();
      this.videoEl = null;
    }

    this.listeners.clear();
    this.state = { ...INITIAL_STATE };
  }

  private bindPlayerEvents(clpp: any): void {
    if (!this.player) return;

    this.player.on(clpp.events.STATE_CHANGED, (e: any) => {
      const { currentState } = e.detail;
      switch (currentState) {
        case clpp.Player.State.PLAYING:
          this.updateState({ playing: true, paused: false, loading: false });
          break;
        case clpp.Player.State.PAUSED:
          this.updateState({ playing: false, paused: true });
          break;
        case clpp.Player.State.BUFFERING:
          this.updateState({ loading: true });
          break;
        case clpp.Player.State.ENDED:
          this.updateState({ playing: false, paused: false, ended: true });
          break;
        case clpp.Player.State.IDLE:
          this.updateState({ playing: false, paused: false, loading: false });
          break;
        case clpp.Player.State.ERROR:
          this.updateState({ playing: false, loading: false, error: 'Playback error' });
          break;
      }
    });

    this.player.on(clpp.events.ERROR, (e: any) => {
      const message = this.mapError(e.detail);
      this.updateState({ error: message, loading: false, playing: false });
    });

    this.player.on(clpp.events.LOADEDMETADATA, () => {
      const duration = this.player?.getDuration?.() || 0;
      this.updateState({ duration, loading: false });
    });

    this.timeInterval = setInterval(() => {
      if (this.player && this.state.playing) {
        const currentTime = this.player.getPosition?.() || 0;
        this.updateState({ currentTime });
      }
    }, 250);
  }

  private detectSourceType(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('.mpd')) return 'dash';
    if (lower.includes('.m3u8')) return 'hls';
    if (lower.includes('.ism')) return 'smooth';
    // Galaxy DRM proxy URLs (.drm) serve DASH manifests
    if (lower.includes('.drm')) return 'dash';
    return 'dash';
  }

  private mapError(err: any): string {
    if (!err) return 'Unknown playback error';

    const code = err.code ?? err.category;
    const msg = err.message ?? err.detail ?? String(err);

    if (code === 6001 || msg.includes('LICENSE')) return 'DRM license request failed';
    if (code === 6012 || msg.includes('expired')) return 'DRM license expired';
    if (msg.includes('HDCP') || msg.includes('output')) return 'HDCP/output protection error';
    if (code === 1001) return 'Network error';

    return `Playback error: ${msg}`;
  }

  private updateState(partial: Partial<PlayerState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
