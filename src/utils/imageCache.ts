import { isTV } from './platformInit';

const MAX_CACHE_SIZE = 50;
const MAX_CONCURRENT = isTV() ? 2 : 6;

const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();
const queue: Array<{ url: string; resolve: (img: HTMLImageElement) => void; reject: (err: Error) => void }> = [];
let activeLoads = 0;

function evictOldest(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;
  const oldest = cache.keys().next().value;
  if (oldest !== undefined) {
    const img = cache.get(oldest);
    if (img) {
      img.src = '';
    }
    cache.delete(oldest);
  }
}

function touchEntry(url: string): void {
  const img = cache.get(url);
  if (img) {
    cache.delete(url);
    cache.set(url, img);
  }
}

function drainQueue(): void {
  while (activeLoads < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift()!;
    startLoad(next.url, next.resolve, next.reject);
  }
}

function startLoad(
  url: string,
  resolve: (img: HTMLImageElement) => void,
  reject: (err: Error) => void,
): void {
  activeLoads++;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    cache.set(url, img);
    pending.delete(url);
    activeLoads--;
    evictOldest();
    resolve(img);
    drainQueue();
  };
  img.onerror = () => {
    pending.delete(url);
    activeLoads--;
    reject(new Error(`Failed to load: ${url}`));
    drainQueue();
  };
  img.src = url;
}

export function preloadImage(url: string): Promise<HTMLImageElement> {
  if (cache.has(url)) {
    touchEntry(url);
    return Promise.resolve(cache.get(url)!);
  }

  const existing = pending.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    if (activeLoads < MAX_CONCURRENT) {
      startLoad(url, resolve, reject);
    } else {
      queue.push({ url, resolve, reject });
    }
  });

  pending.set(url, promise);
  return promise;
}

export function preloadImages(urls: string[]): void {
  for (const url of urls) {
    preloadImage(url).catch(() => {});
  }
}

export function isImageCached(url: string): boolean {
  return cache.has(url);
}
