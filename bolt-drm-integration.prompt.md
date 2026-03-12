# DRM Player Integration — Bolt.new Prompt

This prompt adds DRM-protected video playback to the existing TV VOD app. The player SDK (CastLabs PRESTOplay) is already wrapped in a facade — you only need to wire the UI and API calls.

---

## Pre-built SDK (DO NOT modify)

The following directories are pre-built and must not be edited:

- `src/lib/player/` — Player SDK wrapper (hook, core, engines)
- `vendor/castlabs-prestoplay/` — CastLabs PRESTOplay SDK binary

---

## Player Hook API

Import from `src/lib/player`:

```ts
import { usePlayer } from '../lib/player';
import type { DrmConfig, PlayRequest, PlayerState } from '../lib/player';
```

### usePlayer()

```ts
const { containerRef, state, play, pause, resume, seek, destroy } = usePlayer();
```

| Return | Type | Description |
|--------|------|-------------|
| `containerRef` | `RefCallback<HTMLDivElement>` | Attach to a `<div>` — the player renders inside it |
| `state` | `PlayerState` | Reactive playback state |
| `play(request)` | `(PlayRequest) => Promise<void>` | Load and play content |
| `pause()` | `() => void` | Pause |
| `resume()` | `() => void` | Resume |
| `seek(seconds)` | `(number) => void` | Seek to absolute time |
| `destroy()` | `() => void` | Clean up |

### Types

```ts
interface PlayRequest {
  url: string;
  poster?: string;
  drm?: DrmConfig;    // omit for non-DRM content
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

interface DrmConfig {
  merchant: string;    // always "digitalvirgo"
  userId: string;      // logged-in user's ID
  sessionId: string;   // from SmartVideo API
  assetId: string;     // from SmartVideo API (assets.stream)
  authToken?: string;  // from SmartVideo API (drm.stream)
}

interface PlayerState {
  playing: boolean;
  paused: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string | null;
  ended: boolean;
}
```

---

## Required CSS

Add to `src/index.css`:

```css
.player-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.player-container video {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
}
```

---

## VideoPlayer Component

The `VideoPlayer` component renders a full-screen overlay with the player and controls.

```tsx
<div className="fixed inset-0 z-50 bg-black">
  <div ref={containerRef} className="player-container h-full w-full" />
  {/* Controls overlay on top */}
</div>
```

Key behaviors:
- Call `play({ url, poster, drm, autoplay: true })` on mount
- Use `state.playing`, `state.currentTime`, `state.duration`, `state.loading`, `state.error` for UI
- `state.ended` triggers close
- Show loading spinner when `state.loading`
- Show error overlay when `state.error`

Props:

```ts
interface VideoPlayerProps {
  url: string;
  poster?: string;
  drm?: DrmConfig;
  onClose: () => void;
}
```

---

## DRM Playback Flow

When the user presses Play on a content detail page, determine if the content is DRM-protected and follow the appropriate path.

### Detecting DRM content

```ts
import { getMainDeliveryDrm } from '../utils/assets';

const isDrm = content ? getMainDeliveryDrm(content.deliveries) : false;
```

A delivery is DRM if `mainDelivery.type` contains "drm" or `mainDelivery.drm === true`.

### Non-DRM path

Simply pass the stream URL to the player:

```ts
play({ url: streamUrl, autoplay: true });
```

### DRM path (requires logged-in user)

Three API calls in sequence:

#### Step 1 — Get delivery order

```ts
import { deliveryOrder } from '../services/auth';

const order = await deliveryOrder(user.id, Number(contentId));
// order.orderId is the "do_id" from the API
```

Endpoint: `GET /delivery/order` on User API (`userv1.dv-content.io`).

#### Step 2 — Get DRM config from SmartVideo API

```ts
import { getSmartVideoDrmConfig } from '../services/smartvideo';

const tokenUrl = getMainStreamUrl(content.deliveries) ?? '';

const smartVideo = await getSmartVideoDrmConfig({
  userId: user.id,
  galaxyRef: Number(contentId),
  tokenUrl,
  orderId: order.orderId,
});
```

Endpoint: `GET /delivery` on SmartVideo API (`smartvideo-api.galaxydve.com`).

Returns:
- `smartVideo.stream` — the actual playable stream URL
- `smartVideo.sessionId` — DRM session identifier
- `smartVideo.assets.stream` — asset ID for DRMtoday
- `smartVideo.drm.stream` — auth token for DRMtoday

#### Step 3 — Play with DRM config

```ts
play({
  url: smartVideo.stream,
  autoplay: true,
  drm: {
    merchant: 'digitalvirgo',
    userId: user.id,
    sessionId: smartVideo.sessionId,
    assetId: smartVideo.assets.stream,
    authToken: smartVideo.drm.stream,
  },
});
```

### Complete handlePlay example

```ts
const handlePlay = useCallback(async () => {
  if (!content || !contentId) return;

  // Non-DRM: play directly
  if (!isDrm) {
    const mainUrl = getMainStreamUrl(content.deliveries);
    const trailerUrl = getStreamUrl(content.deliveries);
    setPlayerUrl(mainUrl || trailerUrl);
    setDrmConfig(undefined);
    setShowPlayer(true);
    return;
  }

  // DRM: requires login
  if (!user) {
    setDrmError('Login required for DRM content');
    return;
  }

  setDrmLoading(true);
  setDrmError(null);

  try {
    const order = await deliveryOrder(user.id, Number(contentId));
    if (!order?.orderId) throw new Error('Could not obtain delivery order');

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
    setDrmError(err.message || 'Failed to load DRM content');
  } finally {
    setDrmLoading(false);
  }
}, [content, contentId, isDrm, user]);
```

---

## Vite Proxy Configuration

Add the SmartVideo API proxy to `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api/user': {
      target: 'https://userv1.dv-content.io',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/user/, ''),
      secure: true,
    },
    '/api/smartvideo': {
      target: 'https://smartvideo-api.galaxydve.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/smartvideo/, ''),
      secure: true,
    },
  },
},
```

---

## Services Reference (already implemented)

### `src/services/smartvideo.ts`

- `getSmartVideoDrmConfig(params)` — calls SmartVideo API with MD5 secure param
- Returns `SmartVideoConfig { stream, sessionId, drm, assets, drm_end, drm_view }`

### `src/services/auth.ts`

- `loginWithEmail(email, password)` — DVE User API login with dvHash
- `fetchAccountInfo(userId)` — get user details
- `deliveryOrder(userId, contentRef, orderType?)` — get delivery order (`do_id`)

---

## Dependencies

These must be in `package.json`:

```json
"blueimp-md5": "^2.19.0"
```

---

## Environment Variables

```
VITE_CASTLABS_LICENSE=           # CastLabs SDK license key (localhost always permitted)
VITE_DRM_ENV=DRMtoday            # "DRMtoday" for production, "DRMtoday_STAGING" for staging
VITE_AUTH_HOST=                   # leave empty in dev (uses /api/user proxy)
VITE_AUTH_LOGIN=PlayVodMax_Ios
VITE_AUTH_SECRET=912ai6xn
```
