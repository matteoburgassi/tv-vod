const WORKER_BASE = 'https://smartvideo-cors-proxy.matteoburgassi.workers.dev';

export interface DeviceCodeResponse {
  code: string;
  expiresIn: number;
}

export interface DevicePollResponse {
  status: 'pending' | 'complete' | 'expired';
  user?: Record<string, unknown>;
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch(`${WORKER_BASE}/device/code`, { method: 'POST' });
  if (!res.ok) throw new Error(`Device code request failed: ${res.status}`);
  return res.json() as Promise<DeviceCodeResponse>;
}

export async function pollDeviceCode(code: string): Promise<DevicePollResponse> {
  const res = await fetch(`${WORKER_BASE}/device/poll?code=${code}`);
  if (!res.ok) throw new Error(`Device code poll failed: ${res.status}`);
  return res.json() as Promise<DevicePollResponse>;
}

export async function verifyDeviceCode(
  code: string,
  user: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${WORKER_BASE}/device/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, user }),
  });
  if (!res.ok) throw new Error(`Device verify failed: ${res.status}`);
}

export const PAIR_URL_BASE = 'https://tv-vod.blast.dvbuilder.com/#/pair';
export const POLL_INTERVAL = 3000;
