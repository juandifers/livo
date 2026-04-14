// src/lib/api.client.ts - client-only fetch helpers
'use client';
import Cookies from 'js-cookie';
import { getClientApiBaseUrl } from './api.base';

type FetchJsonOptions = RequestInit & { skipAuth?: boolean };

export async function clientFetchJson<T>(path: string, options: FetchJsonOptions = {}): Promise<T> {
  const token = Cookies.get('token');
  const baseUrl = getClientApiBaseUrl();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!options.skipAuth && token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    credentials: 'include',
    ...options,
    headers,
  });
  if (!res.ok) {
    // FEAT-ADMIN-OVR-001: Parse JSON error to preserve requiresOverride field
    try {
      const errorJson = await res.json();
      // If error response has requiresOverride, throw the whole object
      if (errorJson.requiresOverride) {
        throw errorJson;
      }
      // Otherwise throw with message
      throw new Error(errorJson.error || errorJson.message || `Request failed: ${res.status}`);
    } catch (e) {
      // If JSON parsing fails, fall back to text
      if ((e as any).requiresOverride) {
        throw e; // Re-throw the parsed object
      }
      const text = await res.text().catch(() => '');
      throw new Error(text || `Request failed: ${res.status} ${res.statusText}`);
    }
  }
  return res.json() as Promise<T>;
}

