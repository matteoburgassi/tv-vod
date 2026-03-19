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
  if (window.tizen) return true;
  if (window.webOS) return true;
  if (/Android/.test(navigator.userAgent) && /TV|AFT|BRAVIA|MIBOX/.test(navigator.userAgent)) return true;
  return false;
}
