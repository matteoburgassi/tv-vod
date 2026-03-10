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
