import { sizedUrl as _sizedUrl } from 'tv-vod-api';

export {
  getCoverImage,
  getArtBackground,
  getHighlight,
  getHighlightTitle,
  getStreamUrl,
  getMainStreamUrl,
  getMainDeliveryDrm,
} from 'tv-vod-api';

export function sizedUrl(url: string, w: number, h?: number): string {
  return _sizedUrl(url, w, h, window.devicePixelRatio || 1);
}
