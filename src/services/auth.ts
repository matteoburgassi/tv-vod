import type { User } from '../types/user';

const AUTH_HOST = import.meta.env.VITE_AUTH_HOST || 'https://userv1.dv-content.io';
const AUTH_LOGIN = import.meta.env.VITE_AUTH_LOGIN || 'app_playvod';
const AUTH_SECRET = import.meta.env.VITE_AUTH_SECRET || 'ApPpLAyVDvFs10*';

function basicAuth(): string {
  return 'Basic ' + btoa(`${AUTH_LOGIN}:${AUTH_SECRET}`);
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const res = await fetch(`${AUTH_HOST}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': basicAuth(),
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Login failed (${res.status})`);
  }

  const json = await res.json();
  const data = json.data ?? json;

  return {
    id: String(data.user_id ?? data.id),
    email: data.email ?? email,
    firstname: data.firstname,
    lastname: data.lastname,
    subscribed: data.subscribed ?? false,
    token: data.userdve_ticket ?? data.token,
  };
}

export async function fetchAccountInfo(userId: string): Promise<Partial<User>> {
  const res = await fetch(`${AUTH_HOST}/account/${userId}`, {
    headers: { 'Authorization': basicAuth() },
  });

  if (!res.ok) return {};

  const json = await res.json();
  const data = json.data?.data ?? json.data ?? json;

  return {
    email: data.email,
    msisdn: data.msisdn,
    firstname: data.firstname,
    lastname: data.lastname,
    subscribed: data.subscribed ?? false,
    token: data.token,
  };
}
