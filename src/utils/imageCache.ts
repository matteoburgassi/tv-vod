const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();

export function preloadImage(url: string): Promise<HTMLImageElement> {
  if (cache.has(url)) return Promise.resolve(cache.get(url)!);

  const existing = pending.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      cache.set(url, img);
      pending.delete(url);
      resolve(img);
    };
    img.onerror = () => {
      pending.delete(url);
      reject(new Error(`Failed to load: ${url}`));
    };
    img.src = url;
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
