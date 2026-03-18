export async function resolveBestHlsStream(masterUrl: string): Promise<string> {
  try {
    const res = await fetch(masterUrl);
    if (!res.ok) return masterUrl;
    const text = await res.text();

    const lines = text.split('\n');
    let bestBandwidth = 0;
    let bestUrl = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;

      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
      const nextLine = lines[i + 1]?.trim();

      if (nextLine && !nextLine.startsWith('#') && bandwidth > bestBandwidth) {
        bestBandwidth = bandwidth;
        bestUrl = nextLine;
      }
    }

    if (!bestUrl) return masterUrl;

    if (!bestUrl.startsWith('http')) {
      const base = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
      bestUrl = base + bestUrl;
    }

    return bestUrl;
  } catch {
    return masterUrl;
  }
}
