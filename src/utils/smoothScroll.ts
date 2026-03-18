const active = new WeakMap<Element | Window, number>();

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function smoothScrollTo(
  target: Element | Window,
  to: number,
  axis: 'x' | 'y' = 'y',
  duration = 150,
) {
  const prev = active.get(target);
  if (prev) cancelAnimationFrame(prev);

  const getPos = () => {
    if (target instanceof Window) {
      return axis === 'y' ? target.scrollY : target.scrollX;
    }
    return axis === 'y' ? target.scrollTop : target.scrollLeft;
  };

  const setPos = (v: number) => {
    if (target instanceof Window) {
      if (axis === 'y') target.scrollTo(target.scrollX, v);
      else target.scrollTo(v, target.scrollY);
    } else {
      if (axis === 'y') target.scrollTop = v;
      else target.scrollLeft = v;
    }
  };

  const start = getPos();
  const delta = to - start;

  if (Math.abs(delta) < 1) {
    active.delete(target);
    return;
  }

  const startTime = performance.now();

  function tick(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = start + delta * easeOutCubic(progress);
    setPos(value);

    if (progress < 1) {
      active.set(target, requestAnimationFrame(tick));
    } else {
      active.delete(target);
    }
  }

  active.set(target, requestAnimationFrame(tick));
}
