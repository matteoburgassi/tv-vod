export function platformInit() {
  if (window.tizen) {
    const keys = [
      'MediaPlay',
      'MediaPause',
      'MediaPlayPause',
      'MediaRewind',
      'MediaFastForward',
      'MediaStop',
    ];
    keys.forEach((key) => window.tizen!.tvinputdevice.registerKey(key));
  }
}

export function isTV(): boolean {
  if ((window as any).__TV_PLATFORM__) return true;
  if (window.tizen) return true;
  if (window.webOS) return true;
  const params = new URLSearchParams(window.location.search);
  const platform = params.get('platform');
  if (platform) {
    (window as any).__TV_PLATFORM__ = platform;
    return true;
  }
  if (/Android/.test(navigator.userAgent) && /TV|AFT|BRAVIA|MIBOX|Chromecast/.test(navigator.userAgent)) return true;
  return false;
}
