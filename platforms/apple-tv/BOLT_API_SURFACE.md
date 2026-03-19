# Apple TV App — Shared Package API Surface

This document describes the API available to the Apple TV UI from the shared packages `tv-vod-api` and `tv-vod-auth`. Both are already configured in `index.js` at startup.

---

## tv-vod-api

### Content Fetching

```typescript
import {
  fetchRubricList,        // (rubricId: string) => Promise<RubricItem[]>
  fetchContentsByCategory, // (rubricId: string) => Promise<ContentItem[]>
  fetchContentDetail,     // (contentId: number) => Promise<ContentItem | null>
  searchContent,          // (query: string) => Promise<ContentItem[]>
} from 'tv-vod-api';
```

### Constants

```typescript
import {
  HERO_RUBRIC_ID,        // string — rubric ID for hero/featured content
  CATEGORY_RUBRIC_IDS,   // string[] — rubric IDs for content rows
  RELATED_RUBRIC_ID,     // string — rubric ID for related content
} from 'tv-vod-api';
```

### Asset Utilities

```typescript
import {
  sizedUrl,              // (url, width, height?, dpr?) => string — adds ?width=&height=&fit=inside
  getCoverImage,         // (assets: ContentAssets) => string | null — portrait cover
  getArtBackground,      // (assets: ContentAssets) => string | null — widest background
  getHighlight,          // (assets: ContentAssets) => string | null — highlight image
  getHighlightTitle,     // (assets: ContentAssets) => string | null — title overlay image
  getStreamUrl,          // (deliveries?) => string | null — best trailer HLS URL
  getMainStreamUrl,      // (deliveries?) => string | null — main delivery URL (DRM)
  getMainDeliveryDrm,    // (deliveries?) => boolean — true if DRM protected
} from 'tv-vod-api';
```

For React Native, pass `PixelRatio.get()` as the `dpr` parameter to `sizedUrl`.

### Key Types

```typescript
import type {
  ContentItem,           // { title, description, content_id, content_type, rubric_id[], assets, deliveries? }
  RubricItem,            // { rubric_id, rubric_title, nb_content }
  ContentAssets,         // { cover?, icon?, screenshot?, 'art-background'?, highlight?, 'highlight-title'? }
  ContentDeliveries,     // { ba?, mainDelivery?: { url, type, drm, duration, resolution, audio, subtitle } }
  AssetItem,             // { ratio_tech_label, height, width, url }
} from 'tv-vod-api';
```

---

## tv-vod-auth

### SDK Auth Functions

```typescript
import {
  configure,             // (config: DrmPlayerConfig) => void — already called in index.js
  loginWithEmail,        // (email, password) => Promise<User>
  fetchAccountInfo,      // (userId) => Promise<Partial<User>>
  deliveryOrder,         // (userId, contentRef, orderType?) => Promise<{ orderId } | null>
  getSmartVideoDrmConfig, // (params) => Promise<SmartVideoConfig>
  dvHash,                // (password) => Promise<string>
} from 'tv-vod-auth';
```

### Device Code Flow (QR/PIN Login)

```typescript
import {
  requestDeviceCode,     // () => Promise<{ code: string; expiresIn: number }>
  pollDeviceCode,        // (code) => Promise<{ status: 'pending'|'complete'|'expired'; user? }>
  verifyDeviceCode,      // (code, user) => Promise<void>
  PAIR_URL_BASE,         // string — base URL for companion pairing page
  POLL_INTERVAL,         // number — 3000ms recommended polling interval
} from 'tv-vod-auth';
```

### Auth Storage

```typescript
import {
  createLocalStorageAuth, // () => AuthStorage — uses localStorage (web only)
  createMemoryAuth,       // () => AuthStorage — in-memory (React Native)
} from 'tv-vod-auth';

// AuthStorage interface:
// { getUser(): User | null; setUser(user: User): void; removeUser(): void }
```

For React Native, use `createMemoryAuth()` initially or implement a custom `AuthStorage` using `AsyncStorage`.

### Key Types

```typescript
import type {
  User,                  // { id, email?, msisdn?, firstname?, lastname?, subscribed, token? }
  DrmConfig,             // { merchant, userId, sessionId, assetId, authToken? }
  SmartVideoConfig,      // { stream, sessionId, drm: { stream, dwn_high, dwn_low }, assets, drm_end, drm_view }
  DrmPlayerConfig,       // { serviceId, authLogin?, authSecret?, authHost?, smartVideoHost?, drmEnv?, castlabsLicense? }
} from 'tv-vod-auth';
```

---

## Typical Flows

### Home Screen
1. `fetchContentsByCategory(HERO_RUBRIC_ID)` → hero items
2. `CATEGORY_RUBRIC_IDS.map(id => fetchContentsByCategory(id))` → content rows
3. Use `getCoverImage()` + `sizedUrl(url, w, h, PixelRatio.get())` for card images

### Content Detail
1. `fetchContentDetail(contentId)` → full item with deliveries
2. `getArtBackground(item.assets)` → background image
3. `getMainDeliveryDrm(item.deliveries)` → check if DRM

### DRM Playback
1. Check `user` is logged in; if not, navigate to login
2. `deliveryOrder(user.id, contentId)` → get orderId
3. `getSmartVideoDrmConfig({ userId, galaxyRef, tokenUrl, orderId })` → stream URL + DRM tokens
4. Pass to `react-native-video` with FairPlay configuration

### QR Code Login (TV)
1. `requestDeviceCode()` → display code + QR pointing to `PAIR_URL_BASE?code=XXX`
2. Poll with `pollDeviceCode(code)` every `POLL_INTERVAL` ms
3. When status === 'complete', store `user` and navigate

### Search
1. `searchContent(query)` → matching items
