const KEY_MAP: Record<string, string> = {
  Escape: 'back',
  Backspace: 'back',
  Enter: 'enter',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  MediaPlayPause: 'play_pause',
  MediaRewind: 'rewind',
  MediaFastForward: 'fast_forward',
  MediaStop: 'stop',
  ' ': 'play_pause',
};

const KEYCODE_MAP: Record<number, string> = {
  461: 'back',       // webOS Back
  10009: 'back',     // Tizen Back
  415: 'play_pause', // webOS Play
  19: 'play_pause',  // webOS Pause
  10252: 'play_pause', // Tizen PlayPause
  412: 'rewind',     // webOS Rewind
  10232: 'rewind',   // Tizen Rewind
  417: 'fast_forward', // webOS FastForward
  10233: 'fast_forward', // Tizen FastForward
  413: 'stop',       // webOS Stop
  10253: 'stop',     // Tizen Stop
};

export function mapKeyEvent(event: KeyboardEvent): string | null {
  return KEY_MAP[event.key] ?? KEYCODE_MAP[event.keyCode] ?? null;
}
