/**
 * Debug utility to analyze HLS master playlist structure
 */
export async function debugHlsPlaylist(masterUrl: string): Promise<void> {
  try {
    const res = await fetch(masterUrl);
    if (!res.ok) {
      console.error('[HLS Debug] Failed to fetch master playlist:', res.status);
      return;
    }
    
    const text = await res.text();
    const lines = text.split('\n');
    
    console.group('[HLS Debug] Master Playlist Analysis');
    console.log('URL:', masterUrl);
    console.log('Total lines:', lines.length);
    
    // Find audio tracks
    const audioTracks = lines.filter(line => 
      line.trim().startsWith('#EXT-X-MEDIA:') && line.includes('TYPE=AUDIO')
    );
    console.log('Audio tracks found:', audioTracks.length);
    audioTracks.forEach((track, i) => console.log(`  Audio ${i + 1}:`, track));
    
    // Find video variants
    const variants = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.startsWith('#')) {
          variants.push({ info: line, url: nextLine });
        }
      }
    }
    
    console.log('Video variants found:', variants.length);
    variants.forEach((variant, i) => {
      const bwMatch = variant.info.match(/BANDWIDTH=(\d+)/);
      const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
      const hasAudio = variant.info.includes('AUDIO=') || variant.info.includes('mp4a');
      console.log(`  Variant ${i + 1}: ${bandwidth}bps, hasAudio: ${hasAudio}`);
      console.log(`    Info: ${variant.info}`);
      console.log(`    URL: ${variant.url}`);
    });
    
    console.groupEnd();
  } catch (error) {
    console.error('[HLS Debug] Error analyzing playlist:', error);
  }
}

export async function resolveBestHlsStream(masterUrl: string): Promise<string> {
  try {
    const res = await fetch(masterUrl);
    if (!res.ok) return masterUrl;
    const text = await res.text();

    const lines = text.split('\n');
    let bestBandwidth = 0;
    let bestUrl = '';
    let bestWithAudio = '';
    let bestAudioBandwidth = 0;

    // Check if there are separate audio tracks defined
    const hasAudioTracks = lines.some(line => 
      line.trim().startsWith('#EXT-X-MEDIA:') && line.includes('TYPE=AUDIO')
    );

    console.log('[HLS Debug] Master playlist analysis:', {
      url: masterUrl,
      hasAudioTracks,
      totalLines: lines.length
    });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;

      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
      const nextLine = lines[i + 1]?.trim();

      if (!nextLine || nextLine.startsWith('#')) continue;

      // Check if this variant has audio (either muxed or references audio group)
      const hasAudioGroup = line.includes('AUDIO=');
      const hasCodecs = line.includes('CODECS=');
      let hasAudioCodec = false;
      
      if (hasCodecs) {
        const codecsMatch = line.match(/CODECS="([^"]+)"/);
        if (codecsMatch) {
          const codecs = codecsMatch[1].toLowerCase();
          // Check for audio codecs (aac, mp4a, etc.)
          hasAudioCodec = codecs.includes('mp4a') || codecs.includes('aac') || 
                          codecs.includes('ac-3') || codecs.includes('ec-3');
        }
      }

      // Prefer streams with audio when separate audio tracks exist
      if (hasAudioTracks) {
        // If this variant references an audio group or has audio codecs, prioritize it
        if ((hasAudioGroup || hasAudioCodec) && bandwidth > bestAudioBandwidth) {
          bestAudioBandwidth = bandwidth;
          bestWithAudio = nextLine;
        }
      }

      // Keep track of highest bandwidth overall as fallback
      if (bandwidth > bestBandwidth) {
        bestBandwidth = bandwidth;
        bestUrl = nextLine;
      }
    }

    // Use audio-enabled stream if available, otherwise fall back to highest bandwidth
    const selectedUrl = bestWithAudio || bestUrl;
    
    console.log('[HLS Debug] Stream selection result:', {
      bestWithAudio: bestWithAudio ? `${bestAudioBandwidth}bps` : 'none',
      bestOverall: bestUrl ? `${bestBandwidth}bps` : 'none',
      selected: selectedUrl,
      strategy: bestWithAudio ? 'audio-preferred' : 'highest-bandwidth'
    });
    
    if (!selectedUrl) return masterUrl;

    if (!selectedUrl.startsWith('http')) {
      const base = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
      return base + selectedUrl;
    }

    return selectedUrl;
  } catch {
    return masterUrl;
  }
}
