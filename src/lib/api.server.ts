// src/lib/api.server.ts - server-only fetch helpers
import { cookies } from 'next/headers';

// Prefer env var; fallback to stable backend URL to avoid undefined BASE_URL in production
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://livo-backend-api.vercel.app/api';

type FetchJsonOptions = RequestInit & { skipAuth?: boolean };

export async function serverFetchJson<T>(path: string, options: FetchJsonOptions = {}): Promise<T> {
  const cookieStore: any = await (cookies() as any);
  const token: string | undefined = cookieStore?.get?.('token')?.value;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!options.skipAuth && token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}


