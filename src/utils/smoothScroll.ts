const active = new WeakMap<object, number>();

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function animateValue(
  key: object,
  from: number,
  to: number,
  duration: number,
  onUpdate: (v: number) => void,
  onComplete?: () => void,
) {
  const prev = active.get(key);
  if (prev) cancelAnimationFrame(prev);

  const delta = to - from;
  if (Math.abs(delta) < 1) {
    onUpdate(to);
    active.delete(key);
    onComplete?.();
    return;
  }

  const startTime = performance.now();

  function tick(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    onUpdate(from + delta * easeOutCubic(progress));

    if (progress < 1) {
      active.set(key, requestAnimationFrame(tick));
    } else {
      active.delete(key);
      onComplete?.();
    }
  }

  active.set(key, requestAnimationFrame(tick));
}

export function cancelAnimation(key: object) {
  const id = active.get(key);
  if (id) {
    cancelAnimationFrame(id);
    active.delete(key);
  }
}
