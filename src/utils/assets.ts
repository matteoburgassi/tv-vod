import type { ContentAssets, AssetItem } from '../types/api';

const COVER_RATIO_PRIORITY = ['portrait-3-4', 'portrait-2-3', 'portrait-9-16'];

export function getCoverImage(assets: ContentAssets): string | null {
  const covers = assets.cover;
  if (!covers?.length) return null;

  for (const ratio of COVER_RATIO_PRIORITY) {
    const match = covers.find((c) => c.ratio_tech_label === ratio);
    if (match) return match.url;
  }
  return covers[0].url;
}

export function getArtBackground(assets: ContentAssets): string | null {
  const bgs = assets['art-background'];
  if (!bgs?.length) return null;

  return bgs.reduce<AssetItem>((widest, item) =>
    item.width > widest.width ? item : widest
  , bgs[0]).url;
}

export function getHighlight(assets: ContentAssets): string | null {
  const items = assets.highlight;
  if (!items?.length) return null;
  return items[0].url;
}

export function getHighlightTitle(assets: ContentAssets): string | null {
  const items = assets['highlight-title'];
  if (!items?.length) return null;
  return items[0].url;
}

function pickBestUrl(qualities: Record<string, { url: string }[]>): string | null {
  const preferred = qualities['HD (720p)'];
  if (preferred?.[0]?.url) return preferred[0].url;

  const firstKey = Object.keys(qualities)[0];
  if (!firstKey) return null;
  return qualities[firstKey]?.[0]?.url ?? null;
}

export function getStreamUrl(deliveries?: { ba?: Record<string, { url: string }[]> }): string | null {
  if (!deliveries?.ba) return null;
  return pickBestUrl(deliveries.ba);
}

export function getMainStreamUrl(deliveries?: { mainDelivery?: { url: string } }): string | null {
  if (!deliveries?.mainDelivery) return null;
  return deliveries.mainDelivery.url || null;
}

export function getMainDeliveryDrm(deliveries?: { mainDelivery?: { type?: string; drm?: boolean } }): boolean {
  if (!deliveries?.mainDelivery) return false;
  const d = deliveries.mainDelivery;
  if (d.type?.toLowerCase().includes('drm')) return true;
  return d.drm ?? false;
}
