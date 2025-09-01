// src/lib/api.client.ts - client-only fetch helpers
'use client';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type FetchJsonOptions = RequestInit & { skipAuth?: boolean };

export async function clientFetchJson<T>(path: string, options: FetchJsonOptions = {}): Promise<T> {
  const token = Cookies.get('token');

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


