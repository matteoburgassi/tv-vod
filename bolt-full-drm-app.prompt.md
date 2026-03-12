# Galaxy TV VOD App — Full Build Prompt for Bolt.new

Build a TV-optimized VOD streaming app with React, targeting smart TVs (LG webOS, Samsung Tizen, Android TV) and browsers. The app uses D-pad/remote spatial navigation, connects to the Galaxy content API, authenticates users via DVE User API, and plays DRM-protected content via a pre-built CastLabs PRESTOplay SDK wrapper.

---

## Tech Stack

- React 19, TypeScript, Vite 7, Tailwind CSS v4
- `@noriginmedia/norigin-spatial-navigation` for D-pad navigation
- `react-router-dom` for routing
- `blueimp-md5` for SmartVideo API secure parameter

---

## Project Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router + spatial nav init + auth gate
├── index.css                   # Tailwind + global styles
├── constants/
│   └── api.ts                  # API keys, rubric IDs
├── contexts/
│   └── AuthContext.tsx          # Auth state (user, login, logout)
├── types/
│   ├── api.ts                  # Galaxy API types
│   ├── user.ts                 # User type
│   ├── tizen.d.ts              # Tizen global type
│   └── webos.d.ts              # webOS global type
├── services/
│   ├── api.ts                  # Galaxy content API
│   ├── auth.ts                 # DVE User API (login, account, delivery order)
│   └── smartvideo.ts           # SmartVideo DRM API
├── utils/
│   ├── assets.ts               # Image/stream URL extraction
│   ├── keyMap.ts               # TV remote key mapping
│   └── platformInit.ts         # Tizen/webOS key registration
├── components/
│   ├── Header.tsx              # Fixed header (logo, search, user button)
│   ├── Hero.tsx                # Auto-rotating hero carousel
│   ├── ContentCard.tsx         # Focusable content card
│   ├── ContentRow.tsx          # Horizontal row of cards
│   ├── VideoPlayer.tsx         # Full-screen player with controls
│   ├── ExitDialog.tsx          # Exit confirmation modal
│   └── LoadingSpinner.tsx      # Centered loading spinner
├── pages/
│   ├── HomePage.tsx            # Hero + category rows
│   ├── ContentDetailsPage.tsx  # Details, trailer, play (DRM or native)
│   ├── SearchPage.tsx          # Search with results grid
│   └── LoginPage.tsx           # Email/password login, guest mode
└── lib/
    └── player/                 # PRE-BUILT — DO NOT MODIFY
        ├── index.ts
        ├── types.ts
        ├── usePlayer.ts
        ├── PlayerCore.ts
        └── engines/
            ├── NativeEngine.ts
            └── DrmEngine.ts
```

`vendor/castlabs-prestoplay/` — PRE-BUILT SDK binary, DO NOT MODIFY.

---

## Environment Variables

Create `.env`:

```
VITE_API_BASE_URL=https://galaxy-api.galaxydve.com
VITE_API_KEY=<galaxy_api_key>
VITE_API_SECRET=<galaxy_api_secret>
VITE_CAMPAIGN_ID=4679
VITE_SERVICE_ID=39
VITE_COUNTRY_CODE=fr
VITE_LANGUAGE_CODE=fr

VITE_CASTLABS_LICENSE=
VITE_DRM_ENV=DRMtoday

VITE_AUTH_LOGIN=PlayVodMax_Ios
VITE_AUTH_SECRET=912ai6xn
```

---

## Vite Configuration

```ts
import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@castlabs/prestoplay': resolve(__dirname, 'vendor/castlabs-prestoplay'),
    },
  },
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
})
```

---

## Global Styles (`src/index.css`)

```css
@import "tailwindcss";

@theme {
  --color-sky-400: #38bdf8;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
*::-webkit-scrollbar {
  display: none;
}

html {
  background-color: #0a0a0a;
  color: white;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
  overflow: hidden;
  cursor: none;
}

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

## Types

### Galaxy API (`src/types/api.ts`)

```ts
export interface AssetItem {
  ratio_tech_label: string;
  height: number;
  width: number;
  url: string;
}

export interface ContentAssets {
  cover?: AssetItem[];
  icon?: AssetItem[];
  screenshot?: AssetItem[];
  'art-background'?: AssetItem[];
  highlight?: AssetItem[];
  'highlight-title'?: AssetItem[];
}

export interface DeliveryQuality {
  url: string;
}

export interface ContentDeliveries {
  ba?: Record<string, DeliveryQuality[]>;
  mainDelivery?: {
    url: string;
    type: string;
    drm: boolean;
    duration: number;
    resolution: string;
    audio: string[] | null;
    subtitle: string[] | null;
  };
}

export interface ContentItem {
  title: string;
  description: string;
  content_id: number;
  content_type: string;
  rubric_id: number[];
  assets: ContentAssets;
  deliveries?: ContentDeliveries;
}

export interface RubricItem {
  rubric_id: number;
  rubric_title: string;
  nb_content: number;
}

export interface ApiResponse<T> {
  data: { data: T[] };
}
```

### User (`src/types/user.ts`)

```ts
export interface User {
  id: string;
  email?: string;
  msisdn?: string;
  firstname?: string;
  lastname?: string;
  subscribed: boolean;
  token?: string;
}
```

---

## Constants (`src/constants/api.ts`)

```ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const API_KEY = import.meta.env.VITE_API_KEY;
export const API_SECRET = import.meta.env.VITE_API_SECRET;
export const CAMPAIGN_ID = import.meta.env.VITE_CAMPAIGN_ID;
export const SERVICE_ID = import.meta.env.VITE_SERVICE_ID;
export const COUNTRY_CODE = import.meta.env.VITE_COUNTRY_CODE;
export const LANGUAGE_CODE = import.meta.env.VITE_LANGUAGE_CODE;

export const HERO_RUBRIC_ID = '268833';

export const CATEGORY_RUBRIC_IDS = [
  '273536', '268860', '295883', '287837', '294356', '291318',
  '287839', '287838', '287840', '268858', '268859', '268857',
  '270101', '273535', '268866', '273694', '283300', '268844',
  '268850', '268845',
];

export const RELATED_RUBRIC_ID = '270102';
```

---

## Galaxy Content API (`src/services/api.ts`)

All Galaxy endpoints share common params: `api_key`, `api_secret_key`, `country_code`, `language_code`, `campaign_id`.

```ts
function buildParams(extra: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams({
    api_key: API_KEY,
    api_secret_key: API_SECRET,
    country_code: COUNTRY_CODE,
    language_code: LANGUAGE_CODE,
    campaign_id: CAMPAIGN_ID,
    ...extra,
  });
}
```

| Function | Endpoint | Extra Params |
|----------|----------|--------------|
| `fetchRubricList(rubricId)` | `GET /publishing-rubric-list` | `rubric_id` |
| `fetchContentsByCategory(rubricId)` | `GET /publishing-content-list` | `rubric_id`, `preview=true`, `asset=true`, `delivery=true` |
| `fetchContentDetail(contentId)` | `GET /publishing-content-detail` | `content_id`, `preview=true`, `asset=true`, `delivery=true` |
| `searchContent(query)` | `GET /publishing-content-list` | `content_title`, `content_type=html`, `preview=true`, `asset=true`, `delivery=true`, `without_token=true`, `itemsPerPage=10`, `page=1` |

Response shape: `{ data: { data: T[] } }`

---

## Asset Utilities (`src/utils/assets.ts`)

```ts
getCoverImage(assets)       // Best cover (portrait-3-4 > portrait-2-3 > portrait-9-16 > first)
getArtBackground(assets)    // Widest art-background
getHighlight(assets)        // First highlight image
getHighlightTitle(assets)   // First highlight-title image
getStreamUrl(deliveries)    // Best trailer URL from deliveries.ba (prefer "HD (720p)")
getMainStreamUrl(deliveries) // deliveries.mainDelivery.url
getMainDeliveryDrm(deliveries) // true if mainDelivery.type contains "drm" or drm===true
```

---

## TV Remote Key Mapping (`src/utils/keyMap.ts`)

```ts
export function mapKeyEvent(event: KeyboardEvent): string | null
```

Returns: `'back'`, `'enter'`, `'up'`, `'down'`, `'left'`, `'right'`, `'play_pause'`, `'rewind'`, `'fast_forward'`, `'stop'`, or `null`.

Supports standard keyboard keys plus LG webOS and Samsung Tizen remote keycodes:
- Escape/Backspace/461/10009 -> `back`
- Enter -> `enter`
- Arrows -> `up`/`down`/`left`/`right`
- Space/MediaPlayPause/10252 -> `play_pause`
- MediaRewind/412/10232 -> `rewind`
- MediaFastForward/417/10233 -> `fast_forward`
- MediaStop/413/10253 -> `stop`

---

## Platform Init (`src/utils/platformInit.ts`)

Register Tizen media keys on app start:

```ts
export function platformInit() {
  if (window.tizen?.tvinputdevice) {
    const keys = ['MediaPlayPause', 'MediaRewind', 'MediaFastForward', 'MediaStop'];
    keys.forEach(k => window.tizen.tvinputdevice.registerKey(k));
  }
}
```

---

## Spatial Navigation

Initialize in `App.tsx`:

```ts
import { init } from '@noriginmedia/norigin-spatial-navigation';
init({ debug: false, visualDebug: false, useGetBoundingClientRect: true });
```

### Pattern

Every focusable element uses:

```tsx
const { ref, focused, focusSelf } = useFocusable({
  focusKey: 'unique-key',
  onEnterPress: () => { /* action */ },
  onArrowPress: (direction) => {
    if (direction === 'down') { setFocus('next-key'); return false; }
    return true; // let default behavior handle it
  },
});
```

Wrap focusable regions with `FocusContext.Provider`:

```tsx
<FocusContext.Provider value={focusKey}>
  {children}
</FocusContext.Provider>
```

Use `setFocus('key')` for programmatic focus transitions.

Ensure `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` is called when elements receive focus to handle off-screen elements.

### Focus key conventions

- `header` — app header
- `hero` — hero carousel
- `content-row-{index}` — category rows
- `login-email`, `login-password`, `login-submit`, `login-skip` — login page
- `video-player`, `player-back`, `player-progress`, `player-playpause` — player controls
- `exit-dialog`, `exit-yes`, `exit-no` — exit confirmation

### Focus chaining

Header down -> Hero; Hero down -> first content row; Content rows chain to each other. Player controls: back -> progress -> play/pause (vertical), left/right for seeking.

---

## Authentication

### Auth Context (`src/contexts/AuthContext.tsx`)

```tsx
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}
```

Persists user to `localStorage` key `tv_vod_user`. Wrap app in `<AuthProvider>`.

### Auth Service (`src/services/auth.ts`)

Uses DVE User API with Basic Auth (`PlayVodMax_Ios:912ai6xn`).

In dev, requests go through Vite proxy: `/api/user` -> `userv1.dv-content.io`.

#### Password hashing (dvHash)

The API requires a specific password hash:

```ts
const SALT = 'f5c028c81f560e6cd05c8513b96062b0'; // precomputed, fixed
const SALT_PREFIX = SALT.slice(0, 10);
const SALT_SUFFIX = SALT.slice(10, 32);

async function dvHash(password: string): Promise<string> {
  // SHA1(saltPrefix + password + saltSuffix) using crypto.subtle
}
```

#### Endpoints

| Function | Method | Path | Key Params |
|----------|--------|------|------------|
| `loginWithEmail(email, password)` | POST | `/login/dve` | `service_id`, `login`, `password_dve` |
| `fetchAccountInfo(userId)` | GET | `/accountinfo/all` | `user_id`, `service_id`, `force_cache=1` |
| `deliveryOrder(userId, contentRef, orderType=1)` | GET | `/delivery/order` | `user_id`, `service_id`, `content_ref`, `order_type` |

Login response: `{ data: { user_id, userdve_ticket } }`. Delivery order response: `{ data: { do_id } }`.

### Login Page (`src/pages/LoginPage.tsx`)

TV-friendly login with focusable inputs:
- Email input (focusKey: `login-email`)
- Password input (focusKey: `login-password`)
- Login button (focusKey: `login-submit`)
- "Continue as Guest" button (focusKey: `login-skip`) — logs in as `{ id: 'guest', subscribed: false }`

Show when `!isAuthenticated` (gate in `App.tsx`, not a route).

---

## SmartVideo DRM API (`src/services/smartvideo.ts`)

Fetches DRM stream URL and tokens. In dev, proxied via `/api/smartvideo`.

```ts
import md5 from 'blueimp-md5';

function secureParam(pub: number): string {
  return md5(`${pub}drmPrivateKey4androidclient`);
}
```

Endpoint: `GET /delivery`

| Param | Value |
|-------|-------|
| `is_download` | `0` |
| `method` | `getvideodrmmobile` |
| `user` | `clientdrmandroid` |
| `kliento` | `1` |
| `user_id` | logged-in user ID |
| `pub` | `Date.now()` |
| `website` | `www.playvod.fr` |
| `idm` | `9004` |
| `secure` | `md5(pub + "drmPrivateKey4androidclient")` |
| `galaxy_ref` | content ID |
| `token_url` | `mainDelivery.url` from Galaxy |
| `order_id` | `do_id` from delivery order |

Response (`SmartVideoConfig`):

```ts
{
  stream: string;      // actual playable stream URL
  sessionId: string;   // DRM session ID
  drm: { stream: string; ... };   // drm.stream = auth token
  assets: { stream: string; ... }; // assets.stream = asset ID
  drm_end: string;
  drm_view: number;
}
```

---

## Player SDK (PRE-BUILT — DO NOT MODIFY `src/lib/player/`)

### Public API

```ts
import { usePlayer } from '../lib/player';
import type { DrmConfig, PlayRequest, PlayerState } from '../lib/player';

const { containerRef, state, play, pause, resume, seek } = usePlayer();
```

### Usage in VideoPlayer

```tsx
<div ref={containerRef} className="player-container h-full w-full" />
```

### Non-DRM playback

```ts
play({ url: streamUrl, poster: bgImage, autoplay: true });
```

### DRM playback

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

---

## DRM Playback Flow (ContentDetailsPage)

When the Play button is pressed:

1. Check `getMainDeliveryDrm(content.deliveries)` — if false, play directly with `getMainStreamUrl()` or `getStreamUrl()` (trailer fallback)
2. If DRM and no logged-in user, show "Login required" message
3. If DRM and logged in:
   a. Call `deliveryOrder(user.id, contentId)` -> get `orderId`
   b. Call `getSmartVideoDrmConfig({ userId, galaxyRef, tokenUrl, orderId })` -> get stream + tokens
   c. Set `playerUrl = smartVideo.stream`
   d. Set `drmConfig = { merchant: 'digitalvirgo', userId, sessionId, assetId, authToken }`
   e. Show VideoPlayer with `url={playerUrl}` and `drm={drmConfig}`

Show loading state during DRM setup, error state on failure.

---

## Pages

### HomePage

- Fixed **Header** at top (logo, search input, user button)
- **Hero** carousel: fetch `HERO_RUBRIC_ID` content, rotate every 8s, show art-background + highlight + highlight-title, Watch/More Info buttons
- **Category rows**: for each ID in `CATEGORY_RUBRIC_IDS`, fetch rubric title + content list, render as `ContentRow` with horizontal-scrolling `ContentCard` items
- Back key at top level shows `ExitDialog`

### ContentDetailsPage (`/content/:contentId`)

- Full-width hero area with trailer auto-playing (muted, looped) or art-background fallback
- Gradient overlays (bottom-to-top, left-to-right)
- Content title, type badge, description
- Play button (triggers DRM flow above) + Back button
- Related content rows (fetch `RELATED_RUBRIC_ID`)
- If DRM and not logged in, show warning text

### SearchPage (`/search`)

- Text input with spatial navigation focus
- Call `searchContent(query)` on input change (debounced)
- Grid of `ContentCard` results

### LoginPage

- Centered card with email/password inputs
- Login button calls `loginWithEmail`, stores user via `useAuth().login()`
- "Continue as Guest" skips login
- Loading spinner during API call, error message on failure
- All inputs and buttons are focusable with D-pad

---

## Routing (`src/App.tsx`)

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { init } from '@noriginmedia/norigin-spatial-navigation';

init({ debug: false, visualDebug: false, useGetBoundingClientRect: true });

function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/content/:contentId" element={<ContentDetailsPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </BrowserRouter>
  );
}

// Wrap in AuthProvider in main.tsx
```

---

## Styling Guidelines

- Dark theme: background `#0a0a0a`, text white
- Focused elements: `ring-3 ring-white scale-105 shadow-lg shadow-white/20` transition
- Gradients on hero: `bg-gradient-to-t from-[#0a0a0a]`, `bg-gradient-to-r from-[#0a0a0a]/80`
- Cards: rounded corners, subtle hover/focus effects
- All scrollbars hidden, cursor hidden (TV mode)
- Font: Inter (import from Google Fonts or use system fallback)

---

## Key Implementation Notes

1. Every interactive element must use `useFocusable` — TV remotes have no mouse
2. Always call `scrollIntoView` on focus for off-screen elements
3. Use `onArrowPress` to chain focus between sections (header -> hero -> rows)
4. `mapKeyEvent` handles both keyboard and TV remote keys — use it for all key listeners
5. The player SDK handles all CastLabs complexity — just call `play()` with the right config
6. All external API calls need Vite proxy in dev to avoid CORS
7. Use `npx` prefix for scripts in `package.json` (for Bolt.new WebContainer compatibility)

```json
"scripts": {
  "dev": "npx vite",
  "build": "npx tsc -b && npx vite build",
  "preview": "npx vite preview"
}
```
